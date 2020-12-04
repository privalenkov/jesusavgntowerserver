const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();

const httpsOptions = {
  key: fs.readFileSync(process.env.SSL_KEY || path.join(__dirname, 'ssl', 'privateKey.key')),
  cert: fs.readFileSync(process.env.SSL_CERT || path.join(__dirname, 'ssl', 'certificate.crt')),
};

const server = require('https').createServer(httpsOptions, app);

const io = require('socket.io')(server, {
  origins: '*//jesusavgntower.ru:*'
});

const currentVer = 'ddAaCCv17'

server.listen(443);
require('http').createServer(app).listen(80);

app.use(function (req, res, next) {
  if (req.secure) {
    return next();
  } else {
    res.redirect('https://' + req.hostname + req.url);
  }
});

app.use(express.static(__dirname + '/../client'));

app.get('/', (req, res) => {
  res.sendFile('index.html', { root: '../client' });
});

app.get('*', (req, res) => {
  res.redirect('/');
});

function saveToFile() {
  fs.writeFileSync('../hesusappdata', String(clickCount.toFixed(3)));
}

function loadFromFile() {
  try {
    const res = fs.readFileSync('../hesusappdata').toString();
    return parseInt(res);
  } catch {
    return 0.000;
  }
}

function throttle(func, ms = 100) {
  let isThrottled = false,
    savedArgs,
    savedThis;

  function wrapper() {
    if (isThrottled) {
      savedArgs = arguments;
      savedThis = this;
      return;
    }

    func.apply(this, arguments);

    isThrottled = true;

    setTimeout(function () {
      isThrottled = false;
      if (savedArgs) {
        wrapper.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, ms);
  }

  return wrapper;
}

let clickCount = loadFromFile();

const updateClick = throttle((socket) => {
  socket.broadcast.emit('clickInc', clickCount);
}, 200);

const updateClickAuto = throttle(() => {
  io.sockets.emit('autoDec', clickCount);
}, 200);

const updateUserCount = throttle(() => {
  
  io.sockets.emit('updateUserCount', io.engine.clientsCount);
}, 500);
let autoDecBool = false
let counter = 0

io.on('connection', (socket) => {

  socket.on('frontVer', (ver) => {
    console.log(ver)
    if(ver !== currentVer) socket.disconnect()
  });

  const clickInc = throttle((count) => {
    clickCount += 0.001;
    updateClick(socket);
    autoDecBool = false
  }, 50);

  const clickDec = throttle((count) => {
    if(clickCount <= 0) return
    clickCount -= 0.003;
    if(clickCount < 0) clickCount = 0
    updateClick(socket);
  }, 50);

  socket.on('clickInc', (count = 1) => {
    autoDecBool = true
    counter = 0
    if (count < 1 || count > 20) return;

    clickInc(count);
  });

  socket.on('clickDec', (count = 1) => {
    
    if (count < 1 || count > 20) return;

    clickDec(count);
  });

  socket.on('disconnect', updateUserCount);

  socket.emit('connection', clickCount);
  updateUserCount();
});

setInterval(() => {
  if(clickCount > 0) {
    if(!autoDecBool && counter <= 360) {
      counter++
    }
    if(counter >= 360) { 
      if(clickCount <= 0) return
      clickCount -= 0.1;
      updateClickAuto()
      if(clickCount < 0) clickCount = 0
    }
  }
}, 5000);



setInterval(saveToFile, 5000);
