/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

exports.description = 'Register POM tasks for later execution.';

exports.init = function() {
  verbose('[Task] init');

  X.pomTasks = X.pomTasks || {};
};

exports.visitPOM = function(pom) {
  if ( ! pom.tasks ) return;

  pom.tasks.forEach(t => {
    console.log(`[Task] registering task ${t.name} from ${pom.name}`);
    var tasks = X.pomTasks;
    var task = tasks[t.name] || [];
    task.push(t);
    tasks[t.name] = task;
  });
};

exports.end = function() {
  let count = Object.keys(X.pomTasks).length;
  console.log(`[Task] END Registered ${count} tasks`);
};
