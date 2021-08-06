const regHeaders = (data) => {
  const reg = new RegExp('([a-zA-Z|-|,|s]*)');
  return reg.exec(data);
};

const regOrigin = (data) => {
  const reg = new RegExp('[a-zA-Z|d|:|/|,|.|-|*]*');
  return reg.exec(data);
};

module.exports = regHeaders;
module.exports = regOrigin;
