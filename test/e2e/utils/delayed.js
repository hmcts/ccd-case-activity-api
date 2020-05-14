// asynchronously executes the task passed as argument after the specified delay
// eslint-disable-next-line max-len
module.exports = (delay, task) => new Promise((resolve) => setTimeout(() => resolve(task()), delay));
