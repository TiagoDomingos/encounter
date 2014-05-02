"use strict";

var Enemy = new THREE.Mesh(); // initially a default mesh, we'll define this in init()

Enemy.RADIUS = 40;
Enemy.GEOMETRY = new THREE.SphereGeometry(Enemy.RADIUS, 8, 4);
Enemy.MATERIAL = MATS.normal; // see also MATS.wireframe.clone();
Enemy.MESH_SCALE_Y = 0.4; // TODO improve UFO shape

// Player speed is Encounter.MOVEMENT_SPEED
Enemy.MOVEMENT_SPEED = 0.8;

Enemy.isAlive = false;

Enemy.state = null;
Enemy.STATE_MOVING = 'moving';
Enemy.STATE_WAITING = 'waiting';

Enemy.spawnTimerStartedAt = null;

Enemy.movingCountdown = null;
Enemy.waitingCountdown = null;
Enemy.MOVE_TIME_MAX_MS = 5000;
Enemy.MOVE_TIME_MIN_MS = 1000;
Enemy.WAIT_TIME_MAX_MS = 2000;
Enemy.WAIT_TIME_MIN_MS = 1000;

Enemy.TYPE_UFO = 'ufo';
Enemy.TYPE_MISSILE = 'missile';
Enemy.SPAWN_TABLE = [
  //Enemy.TYPE_MISSILE,
  //Enemy.TYPE_MISSILE,
  Enemy.TYPE_UFO,
  Enemy.TYPE_UFO,
  Enemy.TYPE_UFO
];

Enemy.init = function()
{
  // actually set up this Mesh using our materials
  THREE.Mesh.call(Enemy, Enemy.GEOMETRY, Enemy.MATERIAL);
  Enemy.scale.y = Enemy.MESH_SCALE_Y;
}

Enemy.startSpawnTimer = function()
{
  log('started enemy spawn timer');
  Enemy.spawnTimerStartedAt = clock.oldTime;
}

Enemy.spawnIfReady = function()
{
  if ((clock.oldTime - Enemy.spawnTimerStartedAt) > Encounter.TIME_TO_SPAWN_ENEMY_MS)
  {
    Enemy.spawn();
    Enemy.setupMoving();
    State.setupCombat();
  }
}

Enemy.spawn = function()
{
  var diceRoll = UTIL.random(1, Enemy.SPAWN_TABLE.length) - 1; // adjust to be array index
  log('dice roll ' + diceRoll + ' gives enemy: ' + Enemy.SPAWN_TABLE[diceRoll]);
  if (Enemy.SPAWN_TABLE[diceRoll] === Enemy.TYPE_UFO)
  {
    Enemy.spawnUfo();
  }
  else if (Enemy.SPAWN_TABLE[diceRoll] === Enemy.TYPE_MISSILE)
  {
    log('no missile implemented yet');
  }
  else
  {
    error ('unknown enemy type: ' + Enemy.SPAWN_TABLE[diceRoll]);
  }
}

Enemy.spawnUfo = function()
{
  var spawnPoint = Grid.randomLocationCloseToPlayer(Encounter.ENEMY_SPAWN_DISTANCE_MAX);
  spawnPoint.y = Encounter.CAMERA_HEIGHT;
  log('spawning enemy at ' + spawnPoint.x + ', ' + spawnPoint.y + ', ' + spawnPoint.z);
  Enemy.position.copy(spawnPoint);

  scene.add(Enemy);
  State.actors.push(Enemy);
  Enemy.isAlive = true;
}

Enemy.setupWaiting = function()
{
  Enemy.waitingCountdown = UTIL.random(Enemy.WAIT_TIME_MIN_MS, Enemy.WAIT_TIME_MAX_MS);
  log('enemy waiting for ' + Enemy.waitingCountdown + 'ms');
  Enemy.state = Enemy.STATE_WAITING;
}

Enemy.updateWaiting = function(timeDeltaMillis)
{
  Enemy.waitingCountdown -= timeDeltaMillis;
  if (Enemy.waitingCountdown <= 0)
  {
    Enemy.setupMoving();
  }
  else
  {
    if (UTIL.random(50) == 42)
    {
      MY3.rotateObjectToLookAt(Enemy, Player.position);
      Enemy.shoot();
      Enemy.setupMoving();
    }
  }
}

Enemy.setupMoving = function()
{
  Enemy.movingCountdown = UTIL.random(Enemy.MOVE_TIME_MIN_MS, Enemy.MOVE_TIME_MAX_MS);
  Enemy.rotation.y = MY3.randomDirection();
  log('enemy moving for ' + Enemy.movingCountdown + 'ms in direction ' + Enemy.rotation.y);
  Enemy.state = Enemy.STATE_MOVING;
}

Enemy.updateMoving = function(timeDeltaMillis)
{
  Enemy.movingCountdown -= timeDeltaMillis;
  if (Enemy.movingCountdown > 0)
  {
    var actualMoveSpeed = timeDeltaMillis * Enemy.MOVEMENT_SPEED;
    Enemy.translateZ(-actualMoveSpeed);

    // if an obelisk is close (fast check), do a detailed collision check
    if (Physics.isCloseToAnObelisk(Enemy.position, Enemy.RADIUS))
    {
      // check for precise collision
      var obelisk = Physics.getCollidingObelisk(Enemy.position, Enemy.RADIUS);
      // if we get a return there is work to do
      if (typeof obelisk !== "undefined")
      {
        // we have a collision, move the Enemy out but don't change the rotation
        Physics.moveCircleOutOfStaticCircle(obelisk.position, Obelisk.RADIUS, Enemy.position, Enemy.RADIUS);
        Sound.playerCollideObelisk();
      }
    }
  }
  else
  {
    Enemy.setupWaiting();
  }
}

Enemy.update = function(timeDeltaMillis)
{
  switch(Enemy.state)
  {
    case Enemy.STATE_WAITING:
      Enemy.updateWaiting(timeDeltaMillis);
      break;
    case Enemy.STATE_MOVING:
      Enemy.updateMoving(timeDeltaMillis);
      break;
    default:
      error('unknown Enemy state: ' + Enemy.state);
  } 
}

Enemy.shoot = function()
{
  Sound.enemyShoot();
  var shot = Shot.newInstance(Enemy, Enemy.position, Enemy.rotation);
  State.actors.push(shot);
  scene.add(shot);
}

Enemy.destroyed = function()
{
  Sound.playerKilled();
  scene.remove(Enemy);
  Enemy.isAlive = false;

  State.actorIsDead(Enemy);
  State.enemyKilled();
}