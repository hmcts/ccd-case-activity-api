// asynchronously executes the task passed as argument after the specified delay
module.exports = (delay, task) => new Promise(resolve => setTimeout(() => resolve(task()), delay));
