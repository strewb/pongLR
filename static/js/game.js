(function() {
  var socket = io();
  var c = document.getElementById('container');
  var setHost = document.getElementById('set-host');
  var setPlayer = document.getElementById('set-player');
  setHost.addEventListener('click', setHostEventListener);
  setPlayer.addEventListener('click', setPlayerEventListener);

  function setHostEventListener(event) {
    event.stopPropagation();
    c.innerHTML = '<canvas id="game"></canvas> ';
    setHost.removeEventListener('click', setHostEventListener);
    setPlayer.removeEventListener('click', setPlayerEventListener);
    setupHost();
  }

  function setPlayerEventListener(event) {
    event.stopPropagation();
    c.innerHTML = '<canvas id="game-player"></canvas><div id="player-name"></div>';
    setHost.removeEventListener('click', setHostEventListener);
    setPlayer.removeEventListener('click', setPlayerEventListener);
    //fullScreen();
    setupPlayer();
  }

  function setupHost() {
    socket.emit('host game', { gameName: 'lily' });
    var players = [];
    playerPlacementOrder = ['left', 'right']; 
    var wallL=0,
      wallR=0,
      point1=0,
      point2=0,
      over = true,
      startBtn = {},
      restartBtn={} ,
      GameOver = false;
    socket.on('new player joined', function(data) {
    console.log('new player joined', data);
    players.push(setupPlayer({
        name: data.playerName,
        color: data.playerColor,
        placement: playerPlacementOrder[players.length],
        leftKey: 37,
        rightKey: 39
      }));
    });

    socket.on('player left', function(data) {
      console.log('player left', data);
      players = players.filter(function(p) { return p.name !== data.playerName; });
    });

    socket.on('orientation data', function(data) {
      var player = players.filter(function(p) { return p.name === data.playerName; })[0];
      if (!player) return console.log('Player not found', data.playerName);
      var tilt = data.beta;
      if (tilt < -45) tilt = -45;
      if (tilt > 45) tilt = 45;
      tilt += 45;
      player.pos = tilt / 90;
    });

    // Add mousedown events to the canvas
      document.addEventListener('click', btnClick, true);

    collision = document.getElementById("collide");
    var img = document.getElementById("pic");
    var canvas = document.getElementById('game');
    var ctx = canvas.getContext('2d');

    function getViewPortSize() {
      // http://stackoverflow.com/questions/1248081/get-the-browser-viewport-dimensions-with-javascript
      var w = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
      var h = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
      return { x: 0, y: 0, w: w, h: h };
    }

    function getGameBoardSize() {
      var vp = getViewPortSize();
      return { x: 40, y: 4, w: vp.w - 80, h: vp.h - 8, border: 4, vp: vp };
    }

    function setViewPort() {
      var vp = getViewPortSize();
      canvas.width = vp.w;
      canvas.height = vp.h;
    }

    setViewPort();
    window.onresize = setViewPort;
    var ball = {};
    function setupPlayer(options) {
      var player = {
        name: options.name,
        placement: options.placement,
        color: options.color,
        pos: 0.5,
        h: 250,
        w: 20,
        size: 80,
        offset: 10,
        left: 0,
        right: 0,
        isHit: false,
      };

      player.getPos = function(gs) {
        var pos;
        if (player.placement === 'top')    pos = { x: gs.x + gs.w * player.pos, y: -player.offset };
        if (player.placement === 'bottom') pos = { x: gs.x + gs.w * player.pos, y: gs.vp.h + player.offset };
        if (player.placement === 'left')   pos = { x:gs.x, y: gs.y + gs.h * player.pos };
        if (player.placement === 'right')  pos = { x: gs.vp.w + gs.x, y: gs.y + gs.h * player.pos };
        if (pos.x + player.w > gs.x + gs.w) pos.x = gs.w - player.w + gs.x;
        if (pos.y + 100 > gs.y + gs.h) pos.y = gs.h -100 + gs.y;
        return pos;
      };

      window.addEventListener('keydown', function(event) {
        if (event.keyCode === options.leftKey) player.left = 1;
        if (event.keyCode === options.rightKey) player.right = 1;
      });

      window.addEventListener('keyup', function(event) {
        if (event.keyCode === options.leftKey) player.left = 0;
        if (event.keyCode === options.rightKey) player.right = 0;
      });

      return player;
    }

    var gs = getGameBoardSize();
    ball.size = 15;
    ball.pos = { x: gs.vp.w/2 - ball.size/2, y: gs.vp.h/2 - ball.size/2 };
    ball.dir = { x: -6, y: 5 };

    function updateScene(delta) {
      var PLAYER_SPEED = 0.0005;
      var gs = getGameBoardSize();
      updateScore(); //updets score count
      // Update player
      players.forEach(function(player) {
        player.pos -= player.left * delta * PLAYER_SPEED;
        player.pos += player.right * delta * PLAYER_SPEED;
        if (player.pos > 1) player.pos = 1;
        if (player.pos < 0) player.pos = 0;
      });

      // Update ball
      ball.pos = addVector(ball.pos, ball.dir);
      // detect hits with players
      players.forEach(function(player) {
        var pos = player.getPos(gs);
        var hit = false;
        var hitDistance = player.size + ball.size;
        var incoming = subPos(pos, ball.pos);
        var distance = lenVector(incoming);
        var yDistance= 0;
        var xdistance= 0;

       if (pos.y-125 <= ball.pos.y+ball.size && pos.y+ 125 >= ball.pos.y+ball.size) {
          if (ball.pos.x - ball.size < gs.x + 20) {
            ball.pos.x = gs.x + ball.size+30;
            ball.dir.x = -ball.dir.x;
            hit = true;
          }
          else if (ball.pos.x + ball.size > gs.x + gs.w-30) {
            ball.pos.x = gs.w - ball.size + gs.x-30;
            ball.dir.x = -ball.dir.x;
            hit = true;
          }
        }
            player.isHit = hit;
      });

      // detect hits with game border
      if (ball.pos.x + ball.size > gs.x + gs.w) {

       wallL=1;
       reRun1();
      }
      else if (ball.pos.x - ball.size < gs.x) {
       wallR=1;
       reRun2();
      }
      if (ball.pos.y + ball.size > gs.y + gs.h) {
        ball.pos.y = gs.h - ball.size + gs.y;
        ball.dir.y = -ball.dir.y;
      } else if (ball.pos.y - ball.size < gs.y) {
        ball.pos.y = gs.y + ball.size;
        ball.dir.y = -ball.dir.y;
      }
    }

    // Function for updating score
      function updateScore() {
        var gs = getGameBoardSize();
         ctx.fillStlye = "white";
         ctx.font = "80px Arial, sans-serif";
         ctx.textAlign = "left";
         ctx.textBaseline = "top";
         ctx.fillText(point2 + "  :  " + point1, gs.vp.w/2-100, 20 );
      }
    function reRun1() {
      if (point2 < 4 && wallL==1){
   		point2 ++;
   		wallL=0;
        var gs = getGameBoardSize();
      ball.pos = { x:  ball.size/2+45, y:  ball.size/2 +20};
      ball.dir = { x: 6, y: 5 }; // cheek to see if the ball starts from where it ended
   	}
   	else {
   		gameOver();
   	}
  }

    function reRun2() {
      if (point1 < 4 && wallR==1){
        point1 ++;
        wallR=0;
         var gs = getGameBoardSize();
        ball.pos = { x: gs.vp.w-ball.size/2-85, y: ball.size/2+20 };
        ball.dir = { x: -6, y: 5 }; // cheek to see if the ball starts from where it ended
    }
      else {
          gameOver();
        }
    }

    function gameOver() {
     if (wallR== 1) {
       point1++;

     }
     else if (wallL == 1) {
      point2++;
    }
      over = true;
      GameOver = true;
    }

    // Function for creating particles object
    function createParticles(x, y, m) {
    	this.x = x || 0;
    	this.y = y || 0;

    	this.radius = 1.2;

    	this.vx = -1.5 + Math.random()*3;
    	this.vy = m * Math.random()*1.5;
    }

    // reStart Button function
       restartBtn = {
         w: 100,
         h: 50,
         x: gs.vp.w/2-100,
         y: gs.vp.h/2-50,

         draw: function() {
           var gs = getGameBoardSize();
           drawBorder2(gs.vp);
           updateScore();
           players.forEach(function(player) {
             drawPlayer(gs, player);
           });

          if (wallL==1) {
             ctx.fillStlye = 'rgb(255, 255, 26)';
             ctx.font = "40px Arial, sans-serif";
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillText("Player1 is the WINER", gs.vp.w/2, gs.vp.h/2 -100 );
            }

            else if (wallR == 1) {
             ctx.fillStlye = 'rgb(255, 255, 26)';
             ctx.font = "40px Arial, sans-serif";
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillText("Player2 is the WINER", gs.vp.w/2, gs.vp.h/2 - 100 );
            }

             ctx.fillStlye = 'rgb(255, 255, 26)';
             ctx.font = "40px Arial, sans-serif";
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillText("GAME OVER ", gs.vp.w/2, gs.vp.h/2 - 150 );
             ctx.strokeStyle = 'rgb(255, 255, 26)';
             ctx.lineWidth = "2";
             ctx.strokeRect(gs.vp.w/2-100, gs.vp.h/2-50, 200, 100);
             ctx.font = "40px Arial, sans-serif";
             ctx.textAlign = "center";
             ctx.textBaseline = "middle";
             ctx.fillStlye = "white";
             ctx.fillText("RESTART", gs.vp.w/2, gs.vp.h/2  );
         }
       };

     startBtn = {
         w: 100,
         h: 50,
         x: gs.vp.w/2-100,
         y: gs.vp.h/2-50,
         draw: function() {
           var gs = getGameBoardSize();
           ctx.strokeStyle = "white";
           ctx.lineWidth = "2";
           ctx.strokeRect(gs.vp.w/2-100, gs.vp.h/2-50, 200, 100);
           ctx.font = "40px Arial, sans-serif";
           ctx.textAlign = "center";
           ctx.textBaseline = "middle";
           ctx.fillStlye = "Green";
           ctx.fillText(" START", gs.vp.w/2, gs.vp.h/2  );
           ctx.fillText("Connect your mobile device to control ", gs.vp.w/2, gs.vp.h/2-200  );
           ctx.fillText(" the left and right paddels and press start START", gs.vp.w/2, gs.vp.h/2-160  );
          }
       };


    function btnClick(e) {
           // Variables for storing mouse position on click
           var mx = e.pageX,
               my = e.pageY;
           // Click start button
           if(mx >= startBtn.x  && mx <= startBtn.x + startBtn.w) {
              over = false;
              startScreen();
           }
           // If the game is over, and the restart button is clicked
          if(GameOver == true) {
             if(mx >= restartBtn.x && mx <= restartBtn.x + restartBtn.w) {
              point1 = 0;
              point2 = -1;
              wallR = 0;
              wallL = 0;
              var gs = getGameBoardSize();
              ball.pos = { x: gs.vp.w - ball.size/2, y: gs.vp.h + ball.size/2 };
              ball.dir = { x: -5, y: 4 };
              over = false;
              GameOverover = false;
              }
           }
    }

    function addVector(a, b) {
      return { x: a.x + b.x, y: a.y + b.y };
    }

    function subPos(a, b) {
      return { x: a.x - b.x, y: a.y - b.y };
    }

    function mulVector(a, scalar) {
      return { x: a.x * scalar, y: a.y * scalar };
    }

    function normalizeVector(a) {
      var len = lenVector(a);
      return mulVector(a, 1/len);
    }

    function lenVector(a) {
      return Math.sqrt(a.x*a.x + a.y*a.y)
    }

    function cpyVector(a) {
      return { x: a.x, y: a.y };
    }

    function dotProduct(a, b) {
      return a.x * b.x + a.y * b.y;
    }

    function angleVector(a, b) {
      // returns the angle in radians
      return Math.acos(dotProduct(a, b));
    }

    function rotateVector(a, angle) {
      // angle is in radians
      return {
        x: a.x * Math.cos(angle) - a.y * Math.sin(angle),
        y: a.x * Math.sin(angle) + a.y * Math.cos(angle),
      };
     }

// starts the hole game
  function startScreen(){
      if (over==true) {
          if (GameOver == false) {
              //  drawScene();
            drawBorder2(gs.vp);

             players.forEach(function(player) {
               drawPlayer(gs, player);
             });
               //  drawstartBtn();
             startBtn.draw();
              }
          else if (GameOver == true){
                restartBtn.draw();
              }
        }
      else {
        updateScene(delta);
        drawScene();
      }
   }


    function drawScene() {
      var gs = getGameBoardSize();

      ctx.clearRect(0, 0, gs.vp.w, gs.vp.h);

      drawBorder(gs.vp);

      players.forEach(function(player) {
        drawPlayer(gs, player);
      });

      drawBall(ball);
      updateScore();
    }

    function drawBorder(vp) {

      ctx.fillStyle = 'white';
      ctx.fillRect(gs.x, 8, 4, vp.h-20);
      ctx.fillRect(gs.x, 8, vp.w-80, 4);
      ctx.fillRect(vp.w-40, 8, 4, vp.h-20);
     ctx.fillRect(gs.x, vp.h-16, vp.w-80, 4);
      ctx.fillRect(vp.w/2, 8, 4, vp.h-20);
    }

    function drawBorder2(vp) {
      ctx.clearRect(0, 0, gs.vp.w, gs.vp.h);
      ctx.fillStyle = 'white';
      ctx.fillRect(gs.x, 8, 4, vp.h-20);
      ctx.fillRect(gs.x, 8, vp.w-80, 4);
      ctx.fillRect(vp.w-40, 8, 4, vp.h-20);
     ctx.fillRect(gs.x, vp.h-16, vp.w-80, 4);

    }

    function drawPlayer(gs, player) {

      ctx.fillStyle = player.color;
      var pos = player.getPos(gs);
      ctx.fillRect(pos.x,pos.y-125,player.w,player.h);

    }

    function drawBall(ball) {
      ctx.fillStyle = 'rgb(255, 255, 26)';
      ctx.beginPath();
      ctx.arc(ball.pos.x, ball.pos.y, ball.size, 0, Math.PI*2, false);
      ctx.fill();
    }


  var delta = 0;
  var prevTime = new Date();
  var ih = setInterval(function() {
    var now = new Date();
         delta = now - prevTime;
         prevTime = now;
         startScreen();
       }, 15);
  }

  function setupPlayer() {
    var canvas = document.getElementById('game-player');
    var playerNameTag = document.getElementById('player-name');
    var playerName;
    socket.emit('join game', { gameName: 'lily' });
    socket.on('game joined', function(data) {
      console.log('game joined', data);
      canvas.style.backgroundColor = data.playerColor;
      playerNameTag.innerHTML = data.playerName;
      playerName = data.playerName;s
    })

    window.addEventListener('deviceorientation', function(event) {
      var alpha = event.alpha; // direction
      var beta = event.beta; // tilt front-back
      var gamma = event.gamma; // tilt left-right
      var data = { gameName: 'lily', playerName: playerName, alpha: alpha, beta: beta, gamma: gamma };
      socket.emit('orientation data', data);
    });
  }
})();
