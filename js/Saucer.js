'use strict';

// Abstract prototype for all saucer enemies:
//   - shoot() is undefined.

// var Saucer = {};
var Saucer = new THREE.Mesh();

Saucer.RADIUS = 40;
Saucer.GEOMETRY = new THREE.SphereGeometry(Saucer.RADIUS, 8, 4);
Saucer.MESH_SCALE_Y = 0.4;

// Player speed is Encounter.MOVEMENT_SPEED
Saucer.MOVEMENT_SPEED = 0.8;

Saucer.STATE_MOVING = 'moving';
Saucer.STATE_WAITING = 'waiting';
Saucer.STATE_SHOT_WINDUP = 'shotWindup';
Saucer.STATE_SHOOTING = 'shooting';

Saucer.MOVE_TIME_MAX_MS = 5000;
Saucer.MOVE_TIME_MIN_MS = 1000;
Saucer.WAIT_TIME_MAX_MS = 2000;
Saucer.WAIT_TIME_MIN_MS = 1000;

Saucer.SHOT_WINDUP_TIME_MS = 600;
Saucer.SHOTS_TO_FIRE = 1;
Saucer.SHOT_INTERVAL_MS = 800; // only relevant if SHOTS_TO_FIRE > 1 

// in progress

Saucer.radarType = Radar.TYPE_ENEMY;

// not strictly necessary to init these but it gives an indication of what state we need
Saucer.state = null;
Saucer.movingCountdown = null;
Saucer.waitingCountdown = null;
Saucer.shotWindupCountdown = null;
Saucer.shotIntervalCountdown = null;
Saucer.shotsLeftToFire = null;

Saucer.spawn = function()
{
  var spawnPoint = Grid.randomLocationCloseToPlayer(Encounter.ENEMY_SPAWN_DISTANCE_MAX);
  spawnPoint.y = Encounter.CAMERA_HEIGHT;
  log('spawning saucer at ' + spawnPoint.x + ', ' + spawnPoint.y + ', ' + spawnPoint.z);
  this.position.copy(spawnPoint);

  this.setupMoving();

  return this;
}

Saucer.setupWaiting = function()
{
  this.waitingCountdown = UTIL.random(Saucer.WAIT_TIME_MIN_MS, Saucer.WAIT_TIME_MAX_MS);
  log('enemy waiting for ' + this.waitingCountdown + 'ms');
  this.state = Saucer.STATE_WAITING;
}

Saucer.updateWaiting = function(timeDeltaMillis)
{
  this.waitingCountdown -= timeDeltaMillis;
  if (this.waitingCountdown <= 0)
  {
    this.setupMoving();
  }
  else
  {
    // FIXME delegate AI to subclass
    if (UTIL.random(50) == 42)
    {
      this.setupShotWindup();
    }
  }
}

Saucer.setupShotWindup = function()
{
  this.shotWindupCountdown = Saucer.SHOT_WINDUP_TIME_MS;
  Sound.shotWindup();
  log('enemy winding up shot for ' + Saucer.SHOT_WINDUP_TIME_MS + 'ms');
  this.state = Saucer.STATE_SHOT_WINDUP;
}

Saucer.setupShooting = function()
{
  log('enemy shooting');
  // we will always shoot immediately after the windup, so might as well do it here
  this.shoot();

  if (this.SHOTS_TO_FIRE > 1)
  {
    this.shotsLeftToFire = this.SHOTS_TO_FIRE - 1;  // read from 'this' not Saucer so we can override in subclass
    this.shotIntervalCountdown = Saucer.SHOT_INTERVAL_MS;
    this.state = Saucer.STATE_SHOOTING;
  }
  else
  {
    this.setupMoving();
  }
}

Saucer.setupMoving = function()
{
  this.movingCountdown = UTIL.random(Saucer.MOVE_TIME_MIN_MS, Saucer.MOVE_TIME_MAX_MS);
  this.rotation.y = MY3.randomDirection();
  log('enemy moving for ' + this.movingCountdown + 'ms in direction ' + this.rotation.y);
  this.state = Saucer.STATE_MOVING;
}

Saucer.updateShotWindup = function(timeDeltaMillis)
{
  this.shotWindupCountdown -= timeDeltaMillis;
  if (this.shotWindupCountdown <= 0)
  {
    this.setupShooting();
  }
}

Saucer.updateShooting = function(timeDeltaMillis)
{
  this.shotIntervalCountdown -= timeDeltaMillis;

  if (this.shotIntervalCountdown <= 0)
  {
    this.shoot();
    this.shotsLeftToFire -= 1;
    this.shotIntervalCountdown = Saucer.SHOT_INTERVAL_MS;
  }

  if (this.shotsLeftToFire <= 0)
  {
    this.setupMoving();
  }
}

Saucer.updateMoving = function(timeDeltaMillis)
{
  this.movingCountdown -= timeDeltaMillis;
  if (this.movingCountdown > 0)
  {
    var actualMoveSpeed = timeDeltaMillis * Saucer.MOVEMENT_SPEED;
    this.translateZ(-actualMoveSpeed);

    // if an obelisk is close (fast check), do a detailed collision check
    if (Physics.isCloseToAnObelisk(this.position, Saucer.RADIUS))
    {
      // check for precise collision
      var obelisk = Physics.getCollidingObelisk(this.position, Saucer.RADIUS);
      // if we get a return there is work to do
      if (typeof obelisk !== "undefined")
      {
        // we have a collision, move the Saucer out but don't change the rotation
        Physics.moveCircleOutOfStaticCircle(obelisk.position, Obelisk.RADIUS, this.position, Saucer.RADIUS);
        Sound.playerCollideObelisk();
      }
    }
  }
  else
  {
    this.setupWaiting();
  }
}

Saucer.update = function(timeDeltaMillis)
{
  switch(this.state)
  {
    case Saucer.STATE_WAITING:
      this.updateWaiting(timeDeltaMillis);
      break;
    case Saucer.STATE_MOVING:
      this.updateMoving(timeDeltaMillis);
      break;
    case Saucer.STATE_SHOT_WINDUP:
      this.updateShotWindup(timeDeltaMillis);
      break;
    case Saucer.STATE_SHOOTING:
      this.updateShooting(timeDeltaMillis);
      break;
    default:
      error('unknown Saucer state: ' + this.state);
  } 
}


Saucer.newInstance = function()
{
  var newSaucer = new THREE.Mesh(); // initially a default mesh, we'll define this in the subclass

  newSaucer.radarType = Radar.TYPE_ENEMY;

  // not strictly necessary to init these but it gives an indication of what state we need
  newSaucer.state = null;
  newSaucer.movingCountdown = null;
  newSaucer.waitingCountdown = null;
  newSaucer.shotWindupCountdown = null;
  newSaucer.shotIntervalCountdown = null;
  newSaucer.shotsLeftToFire = null;

  newSaucer.spawn = function()
  {
    var spawnPoint = Grid.randomLocationCloseToPlayer(Encounter.ENEMY_SPAWN_DISTANCE_MAX);
    spawnPoint.y = Encounter.CAMERA_HEIGHT;
    log('spawning saucer at ' + spawnPoint.x + ', ' + spawnPoint.y + ', ' + spawnPoint.z);
    this.position.copy(spawnPoint);

    this.setupMoving();

    return this;
  }

  newSaucer.setupWaiting = function()
  {
    this.waitingCountdown = UTIL.random(Saucer.WAIT_TIME_MIN_MS, Saucer.WAIT_TIME_MAX_MS);
    log('enemy waiting for ' + this.waitingCountdown + 'ms');
    this.state = Saucer.STATE_WAITING;
  }

  newSaucer.updateWaiting = function(timeDeltaMillis)
  {
    this.waitingCountdown -= timeDeltaMillis;
    if (this.waitingCountdown <= 0)
    {
      this.setupMoving();
    }
    else
    {
      // FIXME delegate AI to subclass
      if (UTIL.random(50) == 42)
      {
        this.setupShotWindup();
      }
    }
  }

  newSaucer.setupShotWindup = function()
  {
    this.shotWindupCountdown = Saucer.SHOT_WINDUP_TIME_MS;
    Sound.shotWindup();
    log('enemy winding up shot for ' + Saucer.SHOT_WINDUP_TIME_MS + 'ms');
    this.state = Saucer.STATE_SHOT_WINDUP;
  }

  newSaucer.setupShooting = function()
  {
    log('enemy shooting');
    // we will always shoot immediately after the windup, so might as well do it here
    this.shoot();

    if (this.SHOTS_TO_FIRE > 1)
    {
      this.shotsLeftToFire = this.SHOTS_TO_FIRE - 1;  // read from 'this' not Saucer so we can override in subclass
      this.shotIntervalCountdown = Saucer.SHOT_INTERVAL_MS;
      this.state = Saucer.STATE_SHOOTING;
    }
    else
    {
      this.setupMoving();
    }
  }

  newSaucer.setupMoving = function()
  {
    this.movingCountdown = UTIL.random(Saucer.MOVE_TIME_MIN_MS, Saucer.MOVE_TIME_MAX_MS);
    this.rotation.y = MY3.randomDirection();
    log('enemy moving for ' + this.movingCountdown + 'ms in direction ' + this.rotation.y);
    this.state = Saucer.STATE_MOVING;
  }

  newSaucer.updateShotWindup = function(timeDeltaMillis)
  {
    this.shotWindupCountdown -= timeDeltaMillis;
    if (this.shotWindupCountdown <= 0)
    {
      this.setupShooting();
    }
  }

  newSaucer.updateShooting = function(timeDeltaMillis)
  {
    this.shotIntervalCountdown -= timeDeltaMillis;

    if (this.shotIntervalCountdown <= 0)
    {
      this.shoot();
      this.shotsLeftToFire -= 1;
      this.shotIntervalCountdown = Saucer.SHOT_INTERVAL_MS;
    }

    if (this.shotsLeftToFire <= 0)
    {
      this.setupMoving();
    }
  }

  newSaucer.updateMoving = function(timeDeltaMillis)
  {
    this.movingCountdown -= timeDeltaMillis;
    if (this.movingCountdown > 0)
    {
      var actualMoveSpeed = timeDeltaMillis * Saucer.MOVEMENT_SPEED;
      this.translateZ(-actualMoveSpeed);

      // if an obelisk is close (fast check), do a detailed collision check
      if (Physics.isCloseToAnObelisk(this.position, Saucer.RADIUS))
      {
        // check for precise collision
        var obelisk = Physics.getCollidingObelisk(this.position, Saucer.RADIUS);
        // if we get a return there is work to do
        if (typeof obelisk !== "undefined")
        {
          // we have a collision, move the Saucer out but don't change the rotation
          Physics.moveCircleOutOfStaticCircle(obelisk.position, Obelisk.RADIUS, this.position, Saucer.RADIUS);
          Sound.playerCollideObelisk();
        }
      }
    }
    else
    {
      this.setupWaiting();
    }
  }

  newSaucer.update = function(timeDeltaMillis)
  {
    switch(this.state)
    {
      case Saucer.STATE_WAITING:
        this.updateWaiting(timeDeltaMillis);
        break;
      case Saucer.STATE_MOVING:
        this.updateMoving(timeDeltaMillis);
        break;
      case Saucer.STATE_SHOT_WINDUP:
        this.updateShotWindup(timeDeltaMillis);
        break;
      case Saucer.STATE_SHOOTING:
        this.updateShooting(timeDeltaMillis);
        break;
      default:
        error('unknown Saucer state: ' + this.state);
    } 
  }

  return newSaucer;
}
