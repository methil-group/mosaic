const fs = require('fs');

function readFileCallback() {
  fs.readFile('data.txt', 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(data);
  });
}

readFileCallback();
