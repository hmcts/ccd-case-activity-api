const assert = require('assert');
const { PassThrough, Readable } = require('stream');
const { Response } = require('node-fetch');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const addActivity = require('../../app/routes/add-activity');
const { errorHandler } = require('../../app/safe-errors');

const publicResponse = (error) => {
  let result;
  const response = {
    status(status) { this.statusCode = status; return this; },
    json(body) { result = { status: this.statusCode, body }; },
  };
  errorHandler(error, {}, response, () => assert.fail('Unexpected delegation'));
  return result;
};

describe('CCD-7882 validation and bounded diagnostics', () => {
  [{}, { activity: 'PRIVATE_INVALID_INPUT' }].forEach((body) => {
    it(`preserves approved activity guidance for ${JSON.stringify(body)}`, () => {
      const service = { addActivity: () => assert.fail('Invalid activity reached service') };
      let result;
      addActivity(service)({
        params: { caseid: '123' }, authentication: { user: { uid: 'review' } }, body,
      }, {}, (error) => { result = publicResponse(error); });
      assert.strictEqual(result.status, 400);
      assert.deepStrictEqual(result.body, { message: 'activity must be one of: view, edit' });
      assert(!JSON.stringify(result).includes('PRIVATE'));
    });
  });

  it('keeps arbitrary client error diagnostics private', () => {
    const error = new Error('PRIVATE_INTERNAL_DETAIL');
    error.status = 400;
    assert.strictEqual(publicResponse(error).body.message, 'Bad Request');
  });

  const failingFetch = (body) => {
    const response = new Response(body, { status: 502, statusText: 'Bad Gateway' });
    return proxyquire('../../app/util/fetch', {
      'node-fetch': () => Promise.resolve(response),
    });
  };

  it('retains small upstream diagnostics privately', async () => {
    await assert.rejects(failingFetch(Readable.from([Buffer.from('PRIVATE_DETAIL')]))('unused'), (error) => (
      error.status === 502 && error.message.includes('PRIVATE_DETAIL')
      && publicResponse(error).body.message === 'Bad Gateway'
    ));
  });

  it('stops oversized bodies while preserving the upstream status', async () => {
    const body = Readable.from([Buffer.alloc(4097, 'x')]);
    await assert.rejects(failingFetch(body)('unused'), (error) => (
      error.status === 502 && error.cause.type === 'max-size'
      && !error.message.includes('x'.repeat(4097))
    ));
    assert(body.destroyed);
  });

  it('stops stalled bodies while preserving the upstream status', async () => {
    const clock = sinon.useFakeTimers();
    const body = new PassThrough();
    try {
      const checked = assert.rejects(failingFetch(body)('unused'), (error) => (
        error.status === 502 && error.cause.type === 'body-timeout'
      ));
      await clock.tickAsync(1001);
      await checked;
      assert(body.destroyed);
    } finally {
      clock.restore();
      body.destroy();
    }
  });

  it('preserves status when reading the upstream body fails', async () => {
    const body = new PassThrough();
    const checked = assert.rejects(failingFetch(body)('unused'), (error) => (
      error.status === 502 && error.cause.message.includes('PRIVATE_STREAM_FAILURE')
      && publicResponse(error).body.message === 'Bad Gateway'
    ));
    body.destroy(new Error('PRIVATE_STREAM_FAILURE'));
    await checked;
  });
});
