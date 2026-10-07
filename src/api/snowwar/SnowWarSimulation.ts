import { baseVectorX, baseVectorY, direction360ToDirection8, DIRECTION8_X, DIRECTION8_Y, fastSqrt, getAngleFromComponents, isInDistance, iterateSeed, javaDiv, rotateDirection8, SUBTURNS_PER_TURN, TILE_HALFWIDTH, TILE_WIDTH, toInt, validateDirection360, worldToTile } from './SnowWarMath';
import type { ISnowWarHuman, ISnowWarMachine, ISnowWarPile, ISnowWarSnowball, ISnowWarTree, SnowWarEngineEvent, SnowWarPosture } from './SnowWarTypes';
import { SnowWarActivityState, SnowWarObjectType, SnowWarTrajectory } from './SnowWarTypes';

// Port of the AIR deterministic SnowStorm simulation (com/sulake/habbo/game/snowwar: Tile, class_2527,
// class_2526, SynchronizedGameArena, gameobjects/*, events/*). Rules, constants and evaluation order are
// AIR's; the server runs the same simulation and both compare the per-turn checksum.

/** Level shape the simulation needs (subset of AIR GameLevelData / FuseObjectData). */
export interface SnowWarSimLevel
{
    width: number;
    height: number;
    heightMap: string;
    fuseObjects: readonly SnowWarSimFuseObject[];
}

export interface SnowWarSimFuseObject
{
    x: number;
    y: number;
    xDimension: number;
    yDimension: number;
    height: number;
    direction: number;
    canStandOn: boolean;
}

/** Wire object (AIR GameObjectsData entry): variables[0] = type, [1] = id; humans add four strings. */
export interface SnowWarSimObjectData
{
    variables: readonly number[];
    name?: string;
    mission?: string;
    figure?: string;
    sex?: string;
}

/** GameStatus event (AIR SnowWarGameEventData); unused fields are 0. */
export interface SnowWarSimEventData
{
    id: number;
    humanGameObjectId: number;
    targetHumanGameObjectId: number;
    snowBallGameObjectId: number;
    snowBallMachineReference: number;
    x: number;
    y: number;
    trajectory: number;
}

export type SnowWarSimNotification = SnowWarEngineEvent | { type: 'stopWaitingForSnowball'; humanId: number } | { type: 'sound'; name: string };

const INFINITE_HEIGHT = 100000;

const HUMAN_SPEED = 534;
const MAXIMUM_SNOWBALL_COUNT = 5;
const INITIAL_HIT_POINTS = 5;
const SNOWBALL_CREATE_TIME = 20;
const STUN_TIME = 100;
const INVINCIBLE_AFTER_STUN_TIME = 60;
const SNOWBALL_THROW_INTERVAL = 5;
const PLAYER_HEIGHT = 5000;
const SCORE_ON_HIT = 1;
const SCORE_ON_KNOCK_DOWN = 5;
const HUMAN_RADIUS = 1600;

const SNOWBALL_RADIUS = 400;
const THROW_VELOCITY = 2000;
const INITIAL_HEIGHT = 3000;
const LONG_LOB_TIME_TO_TARGET_COEF = 0.0007072135785007072;
const SHORT_LOB_TIME_TO_TARGET_COEF = 0.000559;
const SHORT_LOB_MAX_RANGE = 60000;
const LONG_LOB_MAX_RANGE = 100000;
const DEFAULT_THROW_TO_LOB_CUTOFF_RANGE = 42000;
const QUICK_THROW_HEIGHT_SCALING_FACTOR = 10;
const SHORT_LOB_HEIGHT_SCALING_FACTOR = 25;
const LONG_LOB_HEIGHT_SCALING_FACTOR = 50;

const TREE_RADIUS = TILE_WIDTH - SNOWBALL_RADIUS - 1;
const MACHINE_RADIUS = 1200;
const PILE_RADIUS_PER_SNOWBALL = 100;

interface Point3
{
    x: number;
    y: number;
    z: number;
}

/** AIR `Tile`. */
export class SnowWarTile
{
    public readonly location: Readonly<Point3>;
    public gameObject: SnowWarSimObject = null;
    public fuseObjectCount = 0;
    public fuseBlocked = false;
    public height = 0;
    public blocked = false;

    constructor(public readonly x: number, public readonly y: number)
    {
        this.location = { x: x * TILE_WIDTH, y: y * TILE_WIDTH, z: 0 };
    }

    public addFuseObject(fuseObject: SnowWarSimFuseObject): void
    {
        this.fuseObjectCount++;
        // One fuse object blocks when it cannot be stood on; two or more always block.
        this.fuseBlocked = (this.fuseObjectCount > 1) || !fuseObject.canStandOn;
        this.addToHeight(fuseObject.height);
    }

    public addToHeight(value: number): void
    {
        this.height = toInt(this.height + value);

        if(this.height < 0) this.height = 0;
    }

    public locationIsInTileRange(point: Point3): boolean
    {
        return Math.abs(this.location.x - point.x) < TILE_HALFWIDTH && Math.abs(this.location.y - point.y) < TILE_HALFWIDTH;
    }

    public canMoveTo(): boolean
    {
        return !this.fuseBlocked && !this.gameObject && !this.blocked;
    }

    public addGameObject(gameObject: SnowWarSimObject): boolean
    {
        if(this.gameObject) return false;

        this.gameObject = gameObject;

        return true;
    }

    public removeGameObject(): SnowWarSimObject
    {
        const gameObject = this.gameObject;

        this.gameObject = null;

        return gameObject;
    }

    public get occupyingHuman(): SnowWarHumanObject
    {
        return (this.gameObject instanceof SnowWarHumanObject) ? this.gameObject : null;
    }

    public removeOccupyingHuman(): SnowWarHumanObject
    {
        const human = this.occupyingHuman;

        if(human) this.gameObject = null;

        return human;
    }
}

/** AIR `SnowWarGameObject`. */
export abstract class SnowWarSimObject
{
    public active = false;

    constructor(public readonly id: number)
    {
    }

    public abstract readonly type: number;
    public abstract get numberOfVariables(): number;
    public abstract getVariable(index: number): number;
    public abstract get x(): number;
    public abstract get y(): number;

    public get z(): number
    {
        return 0;
    }

    /** Bounding circle radius (all SnowStorm objects use circle bounds). */
    public abstract get boundingRadius(): number;

    public get collisionHeight(): number
    {
        return this.boundingRadius;
    }

    public subturn(_stage: SnowWarStage): void
    {
    }

    public onRemove(): void
    {
    }

    public testSnowBallCollision(ball: SnowWarSnowballObject): boolean
    {
        return ball.z < this.collisionHeight && isInDistance(this.x, this.y, ball.x, ball.y, this.boundingRadius + SNOWBALL_RADIUS);
    }

    public onSnowBallHit(_stage: SnowWarStage, _ball: SnowWarSnowballObject): void
    {
    }
}

/** AIR `HumanGameObject` (ghost prediction is not ported). */
export class SnowWarHumanObject extends SnowWarSimObject implements ISnowWarHuman
{
    public readonly type = SnowWarObjectType.HUMAN;
    public readonly location: Point3;
    public readonly moveTarget: Point3;
    public currentTile: SnowWarTile;
    public nextTile: SnowWarTile = null;
    public isMoving = false;
    public bodyDirection: number;
    public hitPoints: number;
    public snowballs: number;
    public readonly isBot = 0;
    public activityTimer: number;
    public activityState: number;
    public throwTimer = 0;
    public score: number;
    public readonly team: number;
    public readonly userId: number;
    public readonly name: string;
    public readonly mission: string;
    public readonly figure: string;
    public readonly sex: string;

    constructor(stage: SnowWarStage, data: SnowWarSimObjectData)
    {
        super(data.variables[1]);

        const v = data.variables;

        this.sex = data.sex ?? '';
        this.name = data.name ?? '';
        this.mission = data.mission ?? '';
        this.figure = data.figure ?? '';
        this.team = v[17];
        this.userId = v[18];
        this.activityState = v[11];
        this.activityTimer = v[10];
        this.location = { x: v[2], y: v[3], z: 0 };
        this.bodyDirection = v[6];
        this.hitPoints = v[7];
        this.moveTarget = { x: v[14], y: v[15], z: 0 };
        this.snowballs = v[8];
        this.score = v[16];
        this.currentTile = stage.getTileAt(v[4], v[5]);
        this.currentTile?.addGameObject(this);

        const nextTile = stage.getTileAt(v[12], v[13]);

        if(nextTile && nextTile !== this.currentTile)
        {
            this.nextTile = nextTile;
            this.nextTile.addGameObject(this);
            this.currentTile?.removeOccupyingHuman();
            this.isMoving = true;
        }
    }

    public get numberOfVariables(): number
    {
        return 19;
    }

    public getVariable(index: number): number
    {
        switch(index)
        {
            case 0: return SnowWarObjectType.HUMAN;
            case 1: return this.id;
            case 2: return this.location.x;
            case 3: return this.location.y;
            case 4: return this.currentTile.x;
            case 5: return this.currentTile.y;
            case 6: return this.bodyDirection;
            case 7: return this.hitPoints;
            case 8: return this.snowballs;
            case 9: return this.isBot;
            case 10: return this.activityTimer;
            case 11: return this.activityState;
            case 12: return (this.nextTile ?? this.currentTile).x;
            case 13: return (this.nextTile ?? this.currentTile).y;
            case 14: return this.moveTarget.x;
            case 15: return this.moveTarget.y;
            case 16: return this.score;
            case 17: return this.team;
            case 18: return this.userId;
            default: throw new Error(`No such variable: ${ index }`);
        }
    }

    public get x(): number
    {
        return this.location.x;
    }

    public get y(): number
    {
        return this.location.y;
    }

    public get tileX(): number
    {
        return this.currentTile?.x ?? worldToTile(this.location.x);
    }

    public get tileY(): number
    {
        return this.currentTile?.y ?? worldToTile(this.location.y);
    }

    public get nextTileX(): number
    {
        return this.nextTile?.x ?? this.tileX;
    }

    public get nextTileY(): number
    {
        return this.nextTile?.y ?? this.tileY;
    }

    public get moveTargetX(): number
    {
        return this.moveTarget.x;
    }

    public get moveTargetY(): number
    {
        return this.moveTarget.y;
    }

    public get boundingRadius(): number
    {
        return HUMAN_RADIUS;
    }

    public get collisionHeight(): number
    {
        return PLAYER_HEIGHT;
    }

    public get isStunned(): boolean
    {
        return this.activityState === SnowWarActivityState.STUNNED;
    }

    public get isInvincible(): boolean
    {
        return this.activityState === SnowWarActivityState.INVINCIBLE;
    }

    /** `HumanGameObject.posture`. */
    public get posture(): SnowWarPosture
    {
        if(this.throwTimer > 0) return 'swthrow';

        if(this.activityState === SnowWarActivityState.MAKING_SNOWBALL) return 'swpick';

        if(this.activityState === SnowWarActivityState.STUNNED) return 'swdieback';

        return this.isMoving ? 'swrun' : 'std';
    }

    public onRemove(): void
    {
        if(this.currentTile && this.currentTile.occupyingHuman === this) this.currentTile.removeOccupyingHuman();

        if(this.nextTile && this.nextTile.occupyingHuman === this) this.nextTile.removeOccupyingHuman();

        this.isMoving = false;
    }

    private activityTimerTriggered(stage: SnowWarStage): void
    {
        if(this.activityState === SnowWarActivityState.STUNNED)
        {
            this.hitPoints = INITIAL_HIT_POINTS;
            this.activityState = SnowWarActivityState.INVINCIBLE;
            this.activityTimer = INVINCIBLE_AFTER_STUN_TIME;

            return;
        }

        if(this.activityState === SnowWarActivityState.MAKING_SNOWBALL) this.snowballs++;

        this.activityState = SnowWarActivityState.NORMAL;
        stage.notify({ type: 'stopWaitingForSnowball', humanId: this.id });
    }

    public subturn(stage: SnowWarStage): void
    {
        if(this.activityTimer > 0)
        {
            if(this.activityTimer === 1) this.activityTimerTriggered(stage);

            this.activityTimer--;
        }

        if(this.throwTimer > 0) this.throwTimer--;

        if(!this.canMove() || !this.currentTile)
        {
            this.isMoving = false;

            return;
        }

        if(this.nextTile)
        {
            this.moveTowardsNextTile();

            return;
        }

        if(this.currentTile.locationIsInTileRange(this.moveTarget))
        {
            this.isMoving = false;

            return;
        }

        const angle = getAngleFromComponents(this.moveTarget.x - this.currentTile.location.x, this.moveTarget.y - this.currentTile.location.y);
        let direction = direction360ToDirection8(angle);

        this.nextTile = stage.getTileInDirection(this.currentTile, direction);

        if(!this.nextTile || !this.nextTile.canMoveTo())
        {
            if(this.nextTile && !this.nextTile.canMoveTo())
            {
                if(this.moveTarget.x === this.nextTile.location.x && this.moveTarget.y === this.nextTile.location.y && this.moveTarget.z === this.nextTile.location.z)
                {
                    this.nextTile = null;
                    this.stopMovement();

                    return;
                }
            }

            direction = rotateDirection8(direction, -1);
            this.nextTile = stage.getTileInDirection(this.currentTile, direction);

            if(!this.nextTile || !this.nextTile.canMoveTo())
            {
                direction = rotateDirection8(direction, 2);
                this.nextTile = stage.getTileInDirection(this.currentTile, direction);

                if(this.nextTile && !this.nextTile.canMoveTo()) this.nextTile = null;
            }
        }

        if(this.nextTile)
        {
            this.currentTile.removeOccupyingHuman();
            this.nextTile.addGameObject(this);
            this.bodyDirection = direction;
            this.moveTowardsNextTile();
        }
        else
        {
            this.isMoving = false;
        }
    }

    private moveTowardsNextTile(): void
    {
        const targetX = this.nextTile.location.x;
        const targetY = this.nextTile.location.y;
        let x = this.location.x;
        let y = this.location.y;
        const dx = x - targetX;
        const dy = y - targetY;

        if(dx !== 0)
        {
            if(dx < 0) x = (dx > -HUMAN_SPEED) ? targetX : x + HUMAN_SPEED;
            else x = (dx < HUMAN_SPEED) ? targetX : x - HUMAN_SPEED;
        }

        if(dy !== 0)
        {
            if(dy < 0) y = (dy > -HUMAN_SPEED) ? targetY : y + HUMAN_SPEED;
            else y = (dy < HUMAN_SPEED) ? targetY : y - HUMAN_SPEED;
        }

        this.location.x = x;
        this.location.y = y;

        const distance = Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(this.nextTile.location.z - this.location.z);

        if(distance < 267)
        {
            this.currentTile = this.nextTile;
            this.nextTile = null;
        }

        this.isMoving = true;
    }

    public changeMoveTarget(stage: SnowWarStage, x: number, y: number): void
    {
        if(this.activityState === SnowWarActivityState.MAKING_SNOWBALL)
        {
            this.activityState = SnowWarActivityState.NORMAL;
            this.activityTimer = 0;
            stage.notify({ type: 'stopWaitingForSnowball', humanId: this.id });
        }

        if(this.canMove())
        {
            this.moveTarget.x = x;
            this.moveTarget.y = y;
        }
    }

    private playerIsHitBySnowball(stage: SnowWarStage, thrower: SnowWarHumanObject, direction360: number, ball: SnowWarSnowballObject): void
    {
        if(this.team === thrower.team)
        {
            stage.notify({ type: 'hit', humanId: this.id, byHumanId: thrower.id, damaged: false, knockedDown: false, snowballId: ball.id });

            return;
        }

        if(this.hitPoints <= 0) return;

        const knockedDown = (this.hitPoints === 1);

        if(knockedDown)
        {
            this.playerFallsDown(stage, direction360);
            thrower.onKnockDownHuman(stage, this);
            stage.notify({ type: 'sound', name: 'HBSTG_snowwar_hit3' });
        }

        this.hitPoints--;
        stage.notify({ type: 'hit', humanId: this.id, byHumanId: thrower.id, damaged: true, knockedDown, snowballId: ball.id });

        if(knockedDown) stage.notify({ type: 'knockdown', humanId: this.id, byHumanId: thrower.id });
    }

    private onHitHuman(stage: SnowWarStage, victim: SnowWarHumanObject): void
    {
        if(this.team !== victim.team || stage.isDeathMatch) this.addScore(stage, SCORE_ON_HIT);
    }

    private onKnockDownHuman(stage: SnowWarStage, victim: SnowWarHumanObject): void
    {
        if(this.team !== victim.team || stage.isDeathMatch) this.addScore(stage, SCORE_ON_KNOCK_DOWN);
    }

    private addScore(stage: SnowWarStage, value: number): void
    {
        this.score += value;
        stage.addTeamScore(this.team, value);
        stage.notify({ type: 'scoreChange', humanId: this.id, team: this.team, delta: value, score: this.score, teamScores: stage.teamScores });
    }

    private playerFallsDown(stage: SnowWarStage, direction360: number): void
    {
        this.activityState = SnowWarActivityState.STUNNED;
        this.activityTimer = STUN_TIME;
        this.bodyDirection = rotateDirection8(direction360ToDirection8(direction360), 4);
        this.stopMovement();
        stage.notify({ type: 'stopWaitingForSnowball', humanId: this.id });
    }

    /** `HumanGameObject.stopMovement`: snap to the next (or current) tile centre. */
    public stopMovement(): void
    {
        if(!this.nextTile)
        {
            if(this.currentTile)
            {
                this.moveTarget.x = this.currentTile.location.x;
                this.moveTarget.y = this.currentTile.location.y;
                this.moveTarget.z = 0;
                this.location.x = this.currentTile.location.x;
                this.location.y = this.currentTile.location.y;
                this.location.z = 0;
            }
        }
        else
        {
            this.currentTile = this.nextTile;
            this.location.x = this.nextTile.location.x;
            this.location.y = this.nextTile.location.y;
            this.location.z = 0;
            this.moveTarget.x = this.nextTile.location.x;
            this.moveTarget.y = this.nextTile.location.y;
            this.moveTarget.z = 0;
            this.nextTile = null;
        }

        this.isMoving = false;
    }

    public canThrowSnowballs(): boolean
    {
        return this.snowballs > 0 && this.throwTimer < 1 && this.canMove();
    }

    public startThrowTimer(): void
    {
        this.throwTimer = SNOWBALL_THROW_INTERVAL;
    }

    public throwSnowball(targetX: number, targetY: number): boolean
    {
        if(this.snowballs < 1) return false;

        this.stopMovement();
        this.bodyDirection = direction360ToDirection8(getAngleFromComponents(targetX - this.location.x, targetY - this.location.y));
        this.snowballs--;

        return true;
    }

    public canMove(): boolean
    {
        return this.activityState === SnowWarActivityState.NORMAL || this.activityState === SnowWarActivityState.INVINCIBLE;
    }

    public canMakeSnowballs(): boolean
    {
        return this.canMove() && this.snowballs < MAXIMUM_SNOWBALL_COUNT;
    }

    public startMakingSnowball(): void
    {
        if(!this.canMakeSnowballs()) return;

        this.activityState = SnowWarActivityState.MAKING_SNOWBALL;
        this.activityTimer = SNOWBALL_CREATE_TIME;
        this.stopMovement();
    }

    public getRemainingSnowballCapacity(): number
    {
        return MAXIMUM_SNOWBALL_COUNT - this.snowballs;
    }

    public testSnowBallCollision(ball: SnowWarSnowballObject): boolean
    {
        return !this.isStunned && !this.isInvincible && ball.thrower !== this && super.testSnowBallCollision(ball);
    }

    public onSnowBallHit(stage: SnowWarStage, ball: SnowWarSnowballObject): void
    {
        const thrower = ball.thrower;

        // AIR dereferences the thrower unconditionally; a ball restored by a full status after its thrower
        // left has none, so it only splashes here.
        if(!thrower) return;

        this.playerIsHitBySnowball(stage, thrower, ball.direction360, ball);
        thrower.onHitHuman(stage, this);
        stage.notify({ type: 'sound', name: 'HBSTG_snowwar_hit1' });
    }
}

/** AIR `SnowBallGameObject`. */
export class SnowWarSnowballObject extends SnowWarSimObject implements ISnowWarSnowball
{
    public readonly type = SnowWarObjectType.SNOWBALL;
    public readonly location: Point3 = { x: 0, y: 0, z: 0 };
    public direction360 = 0;
    public trajectory = 0;
    public planarVelocity = 0;
    public timeToLive = 0;
    public thrower: SnowWarHumanObject = null;
    public parabolaOffset = 0;

    public initializeFromData(data: SnowWarSimObjectData, thrower: SnowWarHumanObject): void
    {
        const v = data.variables;

        this.location.x = v[2];
        this.location.y = v[3];
        this.location.z = v[4];
        this.direction360 = validateDirection360(v[5]);
        this.trajectory = v[6];
        this.planarVelocity = v[10];
        this.timeToLive = v[7];
        this.thrower = thrower;
        this.parabolaOffset = v[9];
        this.active = true;
    }

    public initialize(x: number, y: number, z: number, trajectory: number, targetX: number, targetY: number, thrower: SnowWarHumanObject): void
    {
        this.active = true;
        this.location.x = x;
        this.location.y = y;
        this.location.z = z;
        this.trajectory = trajectory;

        const dx = javaDiv((targetX - x) / 200);
        const dy = javaDiv((targetY - y) / 200);

        this.direction360 = validateDirection360(getAngleFromComponents(dx, dy));

        let distance = toInt(fastSqrt((dx * dx) + (dy * dy)) * 200);

        if(trajectory === SnowWarTrajectory.DEFAULT)
        {
            if(distance <= DEFAULT_THROW_TO_LOB_CUTOFF_RANGE) this.trajectory = SnowWarTrajectory.QUICK;
            else if(distance <= SHORT_LOB_MAX_RANGE) this.trajectory = SnowWarTrajectory.SHORT_LOB;
            else this.trajectory = SnowWarTrajectory.LONG_LOB;
        }

        if(this.trajectory === SnowWarTrajectory.QUICK)
        {
            this.timeToLive = 10;
            this.planarVelocity = THROW_VELOCITY;
        }
        else if(this.trajectory === SnowWarTrajectory.SHORT_LOB)
        {
            distance = Math.min(distance, SHORT_LOB_MAX_RANGE);
            this.timeToLive = toInt(distance * SHORT_LOB_TIME_TO_TARGET_COEF);
            this.planarVelocity = (this.timeToLive === 0) ? 0 : javaDiv(distance / this.timeToLive);
        }
        else if(this.trajectory === SnowWarTrajectory.LONG_LOB)
        {
            distance = Math.min(distance, LONG_LOB_MAX_RANGE);
            this.timeToLive = toInt(distance * LONG_LOB_TIME_TO_TARGET_COEF);
            this.planarVelocity = (this.timeToLive === 0) ? 0 : javaDiv(distance / this.timeToLive);
        }

        this.parabolaOffset = javaDiv(this.timeToLive / 2);
        this.thrower = thrower;
    }

    public get numberOfVariables(): number
    {
        return 11;
    }

    public getVariable(index: number): number
    {
        switch(index)
        {
            case 0: return SnowWarObjectType.SNOWBALL;
            case 1: return this.id;
            case 2: return this.location.x;
            case 3: return this.location.y;
            case 4: return this.location.z;
            case 5: return this.direction360;
            case 6: return this.trajectory;
            case 7: return this.timeToLive;
            case 8: return this.thrower ? this.thrower.id : 0;
            case 9: return this.parabolaOffset;
            case 10: return this.planarVelocity;
            default: throw new Error(`No such variable: ${ index }`);
        }
    }

    public get x(): number
    {
        return this.location.x;
    }

    public get y(): number
    {
        return this.location.y;
    }

    public get z(): number
    {
        return this.location.z;
    }

    public get throwerId(): number
    {
        return this.thrower ? this.thrower.id : 0;
    }

    public get boundingRadius(): number
    {
        return SNOWBALL_RADIUS;
    }

    public subturn(stage: SnowWarStage): void
    {
        if(!this.active) return;

        this.timeToLive--;

        if(this.trajectory === SnowWarTrajectory.QUICK) this.updatePosition(QUICK_THROW_HEIGHT_SCALING_FACTOR, true);
        else if(this.trajectory === SnowWarTrajectory.SHORT_LOB) this.updatePosition(SHORT_LOB_HEIGHT_SCALING_FACTOR, false);
        else this.updatePosition(LONG_LOB_HEIGHT_SCALING_FACTOR, false);

        const tile = stage.getTileAt(worldToTile(this.location.x), worldToTile(this.location.y));
        let collision = this.testCollisions(stage, tile);
        let ground = false;

        if(!collision)
        {
            collision = ground = stage.testCollisionWithGround(this);

            if(ground)
            {
                stage.notify({ type: 'sound', name: 'HBSTG_snowwar_miss' });
                stage.notify({ type: 'miss', snowballId: this.id, x: this.location.x, y: this.location.y, z: this.location.z });
            }
        }

        if(!collision) return;

        stage.notify({ type: 'splash', snowballId: this.id, x: this.location.x, y: this.location.y, z: this.location.z, ground });
        stage.putGameObjectOnDeleteList(this);
    }

    private testCollisions(stage: SnowWarStage, tile: SnowWarTile): boolean
    {
        if(!tile) return false;

        if(this.testCollision(stage, tile)) return true;

        const direction = direction360ToDirection8(this.direction360);

        if(this.testCollision(stage, stage.getTileInDirection(tile, direction))) return true;

        if(this.testCollision(stage, stage.getTileInDirection(tile, rotateDirection8(direction, -1)))) return true;

        return this.testCollision(stage, stage.getTileInDirection(tile, rotateDirection8(direction, 1)));
    }

    private testCollision(stage: SnowWarStage, tile: SnowWarTile): boolean
    {
        const target = tile?.gameObject;

        if(!target || !target.testSnowBallCollision(this)) return false;

        if(!(target instanceof SnowWarHumanObject)) stage.notify({ type: 'objectHit', objectId: target.id, objectType: target.type, snowballId: this.id });

        target.onSnowBallHit(stage, this);

        return true;
    }

    private updatePosition(heightFactor: number, capHeight: boolean): void
    {
        const x = this.location.x + javaDiv((baseVectorX(this.direction360) * this.planarVelocity) / 255);
        const y = this.location.y + javaDiv((baseVectorY(this.direction360) * this.planarVelocity) / 255);
        const offset = this.timeToLive - this.parabolaOffset;
        let z = toInt((((this.parabolaOffset * this.parabolaOffset) - (offset * offset)) * heightFactor) + INITIAL_HEIGHT);

        if(capHeight) z = Math.min(z, INITIAL_HEIGHT);

        this.location.x = toInt(x);
        this.location.y = toInt(y);
        this.location.z = z;
    }
}

/** AIR `TreeGameObject`. */
export class SnowWarTreeObject extends SnowWarSimObject implements ISnowWarTree
{
    public readonly type = SnowWarObjectType.TREE;
    public readonly tile: SnowWarTile;
    public readonly direction: number;
    public readonly height: number;
    public readonly fuseObjectId: number;
    public readonly maxHits: number;
    public hits: number;

    constructor(data: SnowWarSimObjectData, stage: SnowWarStage)
    {
        super(data.variables[1]);

        const v = data.variables;

        this.active = true;
        this.tile = stage.getTileAt(worldToTile(v[2]), worldToTile(v[3]));
        this.direction = v[4];
        this.fuseObjectId = v[6];
        this.height = v[5];
        this.hits = v[8];
        this.maxHits = v[7];

        if(this.tile)
        {
            if(this.hits < this.maxHits) this.tile.addGameObject(this);

            this.tile.addToHeight(-this.height);
            this.tile.blocked = true;
        }
    }

    public get numberOfVariables(): number
    {
        return 9;
    }

    public getVariable(index: number): number
    {
        switch(index)
        {
            case 0: return SnowWarObjectType.TREE;
            case 1: return this.id;
            case 2: return this.tile.location.x;
            case 3: return this.tile.location.y;
            case 4: return this.direction;
            case 5: return this.height;
            case 6: return this.fuseObjectId;
            case 7: return this.maxHits;
            case 8: return this.hits;
            default: throw new Error(`No such variable: ${ index }`);
        }
    }

    public get x(): number
    {
        return this.tile.location.x;
    }

    public get y(): number
    {
        return this.tile.location.y;
    }

    public get boundingRadius(): number
    {
        return (this.hits < this.maxHits) ? TREE_RADIUS : 0;
    }

    public get collisionHeight(): number
    {
        return this.height;
    }

    public onSnowBallHit(): void
    {
        if(this.hits < this.maxHits) this.hits++;

        if(this.hits >= this.maxHits) this.tile.removeGameObject();
    }
}

/** AIR `SnowballGivingGameObject`. */
export abstract class SnowWarSnowballGivingObject extends SnowWarSimObject
{
    public readonly tile: SnowWarTile;
    public readonly fuseObjectId: number;
    public snowballCount: number;

    constructor(id: number, snowballCount: number, tile: SnowWarTile, fuseObjectId: number)
    {
        super(id);

        this.active = true;
        this.snowballCount = snowballCount;
        this.tile = tile;
        this.fuseObjectId = fuseObjectId;
    }

    public get x(): number
    {
        return this.tile.location.x;
    }

    public get y(): number
    {
        return this.tile.location.y;
    }

    public pickupSnowballs(count: number): number
    {
        if(this.snowballCount < count) count = this.snowballCount;

        this.snowballCount -= count;
        this.onSnowballPickup();

        return count;
    }

    protected onSnowballPickup(): void
    {
    }
}

/** AIR `SnowballMachineGameObject`. */
export class SnowWarMachineObject extends SnowWarSnowballGivingObject implements ISnowWarMachine
{
    public readonly type = SnowWarObjectType.MACHINE;
    public readonly maxSnowballs: number;
    public readonly direction: number;

    constructor(data: SnowWarSimObjectData, stage: SnowWarStage)
    {
        const v = data.variables;

        super(v[1], v[6], stage.getTileAt(worldToTile(v[2]), worldToTile(v[3])), v[7]);

        this.maxSnowballs = v[5];
        this.direction = v[4];
        this.tile?.addGameObject(this);
    }

    public get numberOfVariables(): number
    {
        return 8;
    }

    public getVariable(index: number): number
    {
        switch(index)
        {
            case 0: return SnowWarObjectType.MACHINE;
            case 1: return this.id;
            case 2: return this.tile.location.x;
            case 3: return this.tile.location.y;
            case 4: return this.direction;
            case 5: return this.maxSnowballs;
            case 6: return this.snowballCount;
            case 7: return this.fuseObjectId;
            default: throw new Error(`No such variable: ${ index }`);
        }
    }

    public get boundingRadius(): number
    {
        return MACHINE_RADIUS;
    }

    public createSnowball(): void
    {
        if(this.snowballCount < this.maxSnowballs) this.snowballCount++;
    }
}

/** AIR `SnowballPileGameObject`. */
export class SnowWarPileObject extends SnowWarSnowballGivingObject implements ISnowWarPile
{
    public readonly type = SnowWarObjectType.PILE;
    public readonly maxSnowballs: number;
    private _radius: number;

    constructor(data: SnowWarSimObjectData, stage: SnowWarStage)
    {
        const v = data.variables;

        super(v[1], v[5], stage.getTileAt(worldToTile(v[2]), worldToTile(v[3])), v[6]);

        this.maxSnowballs = v[4];

        if(this.snowballCount > 0) this.tile?.addGameObject(this);

        this._radius = this.snowballCount * PILE_RADIUS_PER_SNOWBALL;
    }

    public get numberOfVariables(): number
    {
        return 7;
    }

    public getVariable(index: number): number
    {
        switch(index)
        {
            case 0: return SnowWarObjectType.PILE;
            case 1: return this.id;
            case 2: return this.tile.location.x;
            case 3: return this.tile.location.y;
            case 4: return this.maxSnowballs;
            case 5: return this.snowballCount;
            case 6: return this.fuseObjectId;
            default: throw new Error(`No such variable: ${ index }`);
        }
    }

    public get boundingRadius(): number
    {
        return this._radius;
    }

    protected onSnowballPickup(): void
    {
        this._radius = this.snowballCount * PILE_RADIUS_PER_SNOWBALL;

        if(this.snowballCount <= 0) this.tile.removeGameObject();
    }
}

/** A queued arena event (AIR ISynchronizedGameEvent); targets are resolved when the GameStatus arrives. */
export type SnowWarArenaEvent = (stage: SnowWarStage) => void;

/**
 * AIR `class_2527` + `class_2526` (stage: tiles, ordered objects, delete list, checksum) and
 * `SynchronizedGameArena` (turn/subturn counters, event queues, team scores).
 */
export class SnowWarStage
{
    private _tiles: SnowWarTile[][] = [];
    private _width = 0;
    private _objects = new Map<number, SnowWarSimObject>();
    private _deleteList: SnowWarSimObject[] = [];
    private _queues = new Map<number, SnowWarArenaEvent[][]>();
    private _checksums = new Map<number, number>();
    private _skipObjectUpdates = false;
    private _teamScores: number[] = [];

    public turn = 0;
    public subturn = 0;

    constructor(public readonly numberOfTeams: number, private readonly _notify: (notification: SnowWarSimNotification) => void = () => undefined)
    {
        for(let i = 0; i < numberOfTeams; i++) this._teamScores.push(0);
    }

    public get isDeathMatch(): boolean
    {
        return this.numberOfTeams === 1;
    }

    public get teamScores(): readonly number[]
    {
        return this._teamScores;
    }

    public notify(notification: SnowWarSimNotification): void
    {
        this._notify(notification);
    }

    // ---- level / tiles (class_2527) ----

    public initialize(level: SnowWarSimLevel): void
    {
        this.linkTiles(level);

        for(const fuseObject of level.fuseObjects)
        {
            const tile = this.getTileAt(fuseObject.x, fuseObject.y);

            if(!tile) continue;

            tile.addFuseObject(fuseObject);
            this.checkAndAdjustNeighbouringTiles(fuseObject);
        }
    }

    private checkAndAdjustNeighbouringTiles(fuseObject: SnowWarSimFuseObject): void
    {
        let xDimension = fuseObject.xDimension;
        let yDimension = fuseObject.yDimension;

        if(fuseObject.direction === 2 || fuseObject.direction === 6)
        {
            const swap = xDimension;

            xDimension = yDimension;
            yDimension = swap;
        }

        for(let i = 1; i < xDimension; i++) this.adjustNeighbour(this.getTileAt(fuseObject.x + i, fuseObject.y), fuseObject);

        for(let i = 1; i < yDimension; i++) this.adjustNeighbour(this.getTileAt(fuseObject.x, fuseObject.y + i), fuseObject);
    }

    private adjustNeighbour(tile: SnowWarTile, fuseObject: SnowWarSimFuseObject): void
    {
        if(!tile) return;

        tile.addToHeight(fuseObject.height);

        if(!fuseObject.canStandOn) tile.blocked = true;
    }

    private linkTiles(level: SnowWarSimLevel): void
    {
        const heights = SnowWarStage.parseHeightMap(level.heightMap);

        this._width = level.width;
        this._tiles = [];

        for(let y = 0; y < level.height; y++)
        {
            const row: SnowWarTile[] = [];

            for(let x = 0; x < level.width; x++) row.push(((heights[y]?.[x]) !== INFINITE_HEIGHT) ? new SnowWarTile(x, y) : null);

            this._tiles.push(row);
        }
    }

    /** AIR `parseHeightMap`: only `x` marks a missing tile; a cell past the row end still exists. */
    private static parseHeightMap(heightMap: string): number[][]
    {
        return heightMap.split('\r').map(row => Array.from(row, char =>
        {
            if(char >= '0' && char <= '9') return char.charCodeAt(0) - 48;

            if(char === 'x') return INFINITE_HEIGHT;

            return 10 + (char.charCodeAt(0) - 97);
        }));
    }

    public getTileAt(x: number, y: number): SnowWarTile
    {
        if(x < 0 || x >= this._width || y < 0 || y >= this._tiles.length) return null;

        return this._tiles[y][x];
    }

    public getTileInDirection(tile: SnowWarTile, direction: number): SnowWarTile
    {
        return this.getTileAt(tile.x + DIRECTION8_X[direction], tile.y + DIRECTION8_Y[direction]);
    }

    public get width(): number
    {
        return this._width;
    }

    public get height(): number
    {
        return this._tiles.length;
    }

    public testCollisionWithGround(ball: SnowWarSnowballObject): boolean
    {
        if(ball.z < 1) return true;

        const tile = this.getTileAt(worldToTile(ball.x), worldToTile(ball.y));

        return tile ? (ball.z < tile.height) : false;
    }

    public resetTiles(): void
    {
        for(const row of this._tiles) for(const tile of row) tile?.removeGameObject();
    }

    // ---- objects (class_2526) ----

    public addGameObject(gameObject: SnowWarSimObject): void
    {
        if(!this._objects.has(gameObject.id))
        {
            this._objects.set(gameObject.id, gameObject);
            this.notify({ type: 'objectAdded', objectId: gameObject.id, objectType: gameObject.type });
        }

        gameObject.active = true;
    }

    public removeGameObject(id: number): void
    {
        const gameObject = this._objects.get(id);

        if(!gameObject) return;

        this._objects.delete(id);
        gameObject.onRemove();
        this.notify({ type: 'objectRemoved', objectId: id, objectType: gameObject.type });
    }

    public removeAllGameObjects(): void
    {
        const objects = [ ...this._objects.values() ];

        this._objects = new Map();

        for(const gameObject of objects)
        {
            gameObject.onRemove();
            this.notify({ type: 'objectRemoved', objectId: gameObject.id, objectType: gameObject.type });
        }
    }

    public putGameObjectOnDeleteList(gameObject: SnowWarSimObject): void
    {
        if(!gameObject) return;

        this._deleteList.push(gameObject);
        gameObject.active = false;
    }

    public getGameObject(id: number): SnowWarSimObject
    {
        return this._objects.get(id) ?? null;
    }

    public getGameObjects(): SnowWarSimObject[]
    {
        return [ ...this._objects.values() ];
    }

    /** One subturn of every object, in insertion order, then the delete list. */
    private updateObjects(): void
    {
        for(const gameObject of [ ...this._objects.values() ]) gameObject.subturn(this);

        if(!this._deleteList.length) return;

        const deleteList = this._deleteList;

        this._deleteList = [];

        for(const gameObject of deleteList) this.removeGameObject(gameObject.id);
    }

    /** `class_2526.calculateChecksum`: seed(turn) + Σ var[i] * (i + 1) over active objects, int32. */
    public calculateChecksum(turn: number): number
    {
        let checksum = iterateSeed(turn);

        for(const gameObject of this._objects.values())
        {
            if(!gameObject.active) continue;

            const count = gameObject.numberOfVariables;

            for(let i = 0; i < count; i++) checksum = toInt(checksum + (gameObject.getVariable(i) * (i + 1)));
        }

        return checksum;
    }

    /** Variable dump of the active objects (wire/checksum order), for diagnostics. */
    public dumpObjects(): number[][]
    {
        const dump: number[][] = [];

        for(const gameObject of this._objects.values())
        {
            if(!gameObject.active) continue;

            const variables: number[] = [];

            for(let i = 0; i < gameObject.numberOfVariables; i++) variables.push(gameObject.getVariable(i));

            dump.push(variables);
        }

        return dump;
    }

    /** `class_1951.initializeGameObjects`. */
    public initializeGameObjects(objects: readonly SnowWarSimObjectData[]): void
    {
        this.removeAllGameObjects();

        for(const data of objects)
        {
            switch(data.variables[0])
            {
                case SnowWarObjectType.SNOWBALL: {
                    const ball = new SnowWarSnowballObject(data.variables[1]);
                    const thrower = this.getGameObject(data.variables[8]);

                    ball.initializeFromData(data, (thrower instanceof SnowWarHumanObject) ? thrower : null);
                    this.addGameObject(ball);
                    break;
                }
                case SnowWarObjectType.TREE:
                    this.addGameObject(new SnowWarTreeObject(data, this));
                    break;
                case SnowWarObjectType.PILE:
                    this.addGameObject(new SnowWarPileObject(data, this));
                    break;
                case SnowWarObjectType.MACHINE:
                    this.addGameObject(new SnowWarMachineObject(data, this));
                    break;
                case SnowWarObjectType.HUMAN:
                    this.addGameObject(new SnowWarHumanObject(this, data));
                    break;
            }
        }
    }

    // ---- arena (SynchronizedGameArena) ----

    public addTeamScore(team: number, value: number): void
    {
        if(team > 0 && team <= this.numberOfTeams) this._teamScores[team - 1] += value;
    }

    public addGameEvent(turn: number, subturn: number, event: SnowWarArenaEvent): void
    {
        if(subturn < 0 || subturn >= SUBTURNS_PER_TURN) return;

        let queue = this._queues.get(turn);

        if(!queue)
        {
            queue = SnowWarStage.emptyQueue();
            this._queues.set(turn, queue);
        }

        queue[subturn].push(event);
    }

    /** `SynchronizedGameArena.gamePulse`: queued events of (turn, subturn), then one object subturn. */
    public pulse(): void
    {
        const queue = this._queues.get(this.turn);

        if(queue)
        {
            const events = queue[this.subturn];

            while(events.length) events.shift()(this);
        }

        if(!this._skipObjectUpdates) this.updateObjects();

        if(this.subturn >= SUBTURNS_PER_TURN - 1)
        {
            this._checksums.set(this.turn, this.calculateChecksum(this.turn));
            this._queues.delete(this.turn);
            this._checksums.delete(this.turn - 64);
            this.turn++;
            this._skipObjectUpdates = false;
        }

        this.subturn++;

        if(this.subturn >= SUBTURNS_PER_TURN) this.subturn = 0;
    }

    /** AS3 `int(undefined)` = 0 for turns that were never simulated. */
    public getChecksum(turn: number): number
    {
        return this._checksums.get(turn) ?? 0;
    }

    /** `SynchronizedGameArena.seekToTurn`: the 3 subturns of `turn` then run without object updates. */
    public seekToTurn(turn: number, checksum: number): void
    {
        this.turn = turn;
        this.subturn = 0;
        this._checksums.set(turn, checksum);
        this._queues = new Map();
        this._queues.set(turn, SnowWarStage.emptyQueue());
        this._skipObjectUpdates = true;
    }

    private static emptyQueue(): SnowWarArenaEvent[][]
    {
        const queue: SnowWarArenaEvent[][] = [];

        for(let i = 0; i < SUBTURNS_PER_TURN; i++) queue.push([]);

        return queue;
    }

    // ---- GameStatus events (class_1951.handleGameStatus + events/*) ----

    /** Builds the arena event for one GameStatus entry; null when AIR would not queue it. */
    public createArenaEvent(data: SnowWarSimEventData): SnowWarArenaEvent
    {
        const human = this.getGameObject(data.humanGameObjectId);
        const actor = (human instanceof SnowWarHumanObject) ? human : null;

        switch(data.id)
        {
            case 1:
                if(!actor) return null;

                return stage =>
                {
                    stage.putGameObjectOnDeleteList(actor);
                    actor.onRemove();
                    stage.notify({ type: 'humanLeft', humanId: actor.id });
                };
            case 2:
                if(!actor) return null;

                return stage => actor.changeMoveTarget(stage, data.x, data.y);
            case 3: {
                const target = this.getGameObject(data.targetHumanGameObjectId);

                if(!actor || !(target instanceof SnowWarHumanObject)) return null;

                return stage =>
                {
                    actor.throwSnowball(target.location.x, target.location.y);
                    actor.startThrowTimer();
                    stage.notify({ type: 'sound', name: 'HBSTG_snowwar_throw' });
                    stage.notify({ type: 'throw', humanId: actor.id, targetHumanId: target.id, targetX: target.location.x, targetY: target.location.y, trajectory: data.trajectory });
                };
            }
            case 4:
                if(!actor) return null;

                return stage =>
                {
                    actor.throwSnowball(data.x, data.y);
                    actor.startThrowTimer();
                    stage.notify({ type: 'sound', name: 'HBSTG_snowwar_throw' });
                    stage.notify({ type: 'throw', humanId: actor.id, targetHumanId: null, targetX: data.x, targetY: data.y, trajectory: data.trajectory });
                };
            case 7:
                if(!actor) return null;

                return () => actor.startMakingSnowball();
            case 8: {
                if(!actor) return null;

                const ball = new SnowWarSnowballObject(data.snowBallGameObjectId);

                return stage =>
                {
                    ball.initialize(actor.location.x, actor.location.y, INITIAL_HEIGHT, data.trajectory, data.x, data.y, actor);
                    stage.addGameObject(ball);
                    stage.notify({ type: 'snowballCreated', snowballId: ball.id, humanId: actor.id });
                };
            }
            case 11: {
                const machine = this.getGameObject(data.snowBallMachineReference);

                if(!(machine instanceof SnowWarMachineObject)) return null;

                return stage =>
                {
                    machine.createSnowball();
                    stage.notify({ type: 'machineRefill', machineId: machine.id, snowballCount: machine.snowballCount });
                };
            }
            case 12: {
                const source = this.getGameObject(data.snowBallMachineReference);

                if(!actor || !(source instanceof SnowWarSnowballGivingObject)) return null;

                return stage =>
                {
                    if(actor.getRemainingSnowballCapacity() <= 0) return;

                    const count = source.pickupSnowballs(1);

                    if(count <= 0) return;

                    actor.snowballs += count;
                    stage.notify({ type: 'sound', name: 'HBSTG_snowwar_get_snowball' });
                    stage.notify({ type: 'pickup', humanId: actor.id, sourceId: source.id, count });
                };
            }
            default:
                return null;
        }
    }

    /** Queues every event of GameStatus(turn) at turn + 1, at its subturn index. */
    public queueGameStatus(turn: number, events: readonly (readonly SnowWarSimEventData[])[]): void
    {
        events.forEach((subturnEvents, subturn) =>
        {
            for(const data of subturnEvents)
            {
                const event = this.createArenaEvent(data);

                if(event) this.addGameEvent(turn + 1, subturn, event);
            }
        });
    }
}
