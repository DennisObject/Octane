import { GetAvatarRenderManager, GetConfiguration, GetEventDispatcher, GetRoomEngine, GetSoundManager, IRoomGameInputHandler, IRoomObjectSpriteVisualization, ObjectDataUpdateMessage, RoomEngine, RoomEngineEvent, RoomPlaneParser, Vector3d } from '@octane/renderer';
import { GetConfigurationValue } from '../octane/GetConfigurationValue';
import { ISnowWarEngine, ISnowWarHuman, ISnowWarSnowball, SnowWarEngineEvent, SnowWarObjectType } from './SnowWarTypes';

/** The arena is a client-only room (AIR game room id 1); an id in RoomId's previewer range (>= 0x7FFF0000) keeps the normal room UI away from it. */
export const SNOWWAR_ROOM_ID = 0x7FFF5357;

const TILE_WIDTH = 3200;
const TILE_HALFWIDTH = 1600;
const USER_TYPE = 1;
const EFFECT_RED_TEAM = 95;
const EFFECT_BLUE_TEAM = 96;
const EFFECT_CROSSHAIR = 98;
const SPLASH_LIFE_SPAN_TIME = 500;
const RAY_GUN_BURST_MS = 500;
const INVINCIBLE_ALPHA = 100;
const WALK_SOUND = 'HBSTG_snowwar_walk';
const NAME_COLOR_TEAM_1 = '#2F9EC9';
const NAME_COLOR_TEAM_2 = '#C34B48';

export interface SnowWarArenaPlayerName
{
    objectId: number;
    name: string;
    color: string;
    shownAt: number;
}

/**
 * AIR `ui/GameArenaView`: renders the simulation through the room engine. Fuse objects are room furniture,
 * humans are room users in the team uniform, snowballs and splashes are game room objects.
 */
export class SnowWarArenaRoom implements IRoomGameInputHandler
{
    private _humans: Set<number> = new Set();
    private _snowballs: Set<number> = new Set();
    private _splashes: { id: number; time: number }[] = [];
    private _rayGunTimers = new Map<number, ReturnType<typeof setTimeout>>();
    private _effects: Map<number, number> = new Map();
    private _playerUnderCursor: number = -1;
    private _walkSound: HTMLAudioElement = null;
    private _disposers: (() => void)[] = [];
    private _stageLoaded: boolean = false;

    constructor(
        private readonly _engine: ISnowWarEngine,
        private readonly _onPlayerName: (name: SnowWarArenaPlayerName) => void)
    {}

    public init(): void
    {
        const roomEngine = GetRoomEngine();
        const level = this._engine.level;
        const rows = level.heightMap.split('\r').map(row => row.replace(/\n/g, ''));
        const planeParser = new RoomPlaneParser();

        planeParser.initializeTileMap(level.width, level.height);

        for(let y = 0; y < level.height; y++)
        {
            const row = rows[y] ?? '';

            for(let x = 0; x < level.width; x++)
            {
                const hasTile = (x < row.length) && (row.charAt(x) !== 'x');

                planeParser.setTileHeight(x, y, hasTile ? 0 : RoomPlaneParser.TILE_BLOCKED);
            }
        }

        planeParser.initializeFromTileData();
        roomEngine.createRoomInstance(SNOWWAR_ROOM_ID, planeParser.getMapData());
        planeParser.dispose();

        roomEngine.updateRoomInstancePlaneVisibility(SNOWWAR_ROOM_ID, false);
        roomEngine.setRoomEngineGameMode(SNOWWAR_ROOM_ID, true);
        roomEngine.setRoomGameInputHandler(SNOWWAR_ROOM_ID, this);

        const onObjectsInitialized = (event: RoomEngineEvent) =>
        {
            if(event.roomId !== SNOWWAR_ROOM_ID) return;

            // Furniture is created over several frames here, so content can finish before the last item exists.
            if(level.fuseObjects.every(fuseObject => roomEngine.getRoomObjectFloor(SNOWWAR_ROOM_ID, fuseObject.id))) this.notifyStageLoaded();
        };

        GetEventDispatcher().addEventListener(RoomEngineEvent.OBJECTS_INITIALIZED, onObjectsInitialized);
        this._disposers.push(() => GetEventDispatcher().removeEventListener(RoomEngineEvent.OBJECTS_INITIALIZED, onObjectsInitialized));

        for(const fuseObject of level.fuseObjects)
        {
            const state = parseInt(fuseObject.state);

            roomEngine.addFurnitureFloorByTypeName(SNOWWAR_ROOM_ID, fuseObject.id, fuseObject.name, new Vector3d(fuseObject.x, fuseObject.y, (fuseObject.altitude / TILE_HALFWIDTH)), new Vector3d(fuseObject.direction * 45), (isNaN(state) ? 0 : state), fuseObject.stuffData);
        }

        if(!level.fuseObjects.length) this.notifyStageLoaded();

        this._disposers.push(this._engine.on('splash', event => this.addSplash(event)));
        this._disposers.push(this._engine.on('rayGunBurst', event => this.showRayGunBurst(event.rayGunFuseObjectId)));
    }

    /** Plus extra: the gun furni shows state 1 for 500 ms on every burst. */
    private showRayGunBurst(fuseObjectId: number): void
    {
        clearTimeout(this._rayGunTimers.get(fuseObjectId));
        this.updateFurnitureState(fuseObjectId, 1);
        this._rayGunTimers.set(fuseObjectId, setTimeout(() =>
        {
            this._rayGunTimers.delete(fuseObjectId);
            this.updateFurnitureState(fuseObjectId, 0);
        }, RAY_GUN_BURST_MS));
    }

    public dispose(): void
    {
        for(const dispose of this._disposers) dispose();

        this._disposers = [];

        for(const timer of this._rayGunTimers.values()) clearTimeout(timer);

        this._rayGunTimers.clear();

        this.setWalkSoundPlaying(false);

        const roomEngine = GetRoomEngine();

        roomEngine.setRoomGameInputHandler(SNOWWAR_ROOM_ID, null);
        roomEngine.setRoomEngineGameMode(SNOWWAR_ROOM_ID, false);
        roomEngine.destroyRoom(SNOWWAR_ROOM_ID);

        this._humans.clear();
        this._snowballs.clear();
        this._splashes = [];
        this._effects.clear();
    }

    public update(): void
    {
        const roomEngine = GetRoomEngine();
        const time = Date.now();
        const objects = this._engine.getObjects();
        const activeIds = new Set<number>();
        const ownHuman = this._engine.getOwnHuman();
        let anyoneRunning = false;

        for(const object of objects)
        {
            activeIds.add(object.id);

            switch(object.type)
            {
                case SnowWarObjectType.HUMAN:
                    anyoneRunning ||= (object.posture === 'swrun');
                    this.updateHuman(object, ownHuman);
                    break;
                case SnowWarObjectType.SNOWBALL:
                    this.updateSnowball(object);
                    break;
                case SnowWarObjectType.MACHINE:
                    this.updateFurnitureState(object.fuseObjectId, object.snowballCount);
                    break;
                case SnowWarObjectType.PILE:
                    this.updateFurnitureState(object.fuseObjectId, (object.maxSnowballs - object.snowballCount));
                    break;
                case SnowWarObjectType.TREE:
                    this.updateFurnitureState(object.fuseObjectId, object.hits);
                    break;
            }
        }

        for(const id of this._humans)
        {
            if(activeIds.has(id)) continue;

            roomEngine.removeRoomObjectUser(SNOWWAR_ROOM_ID, id);
            this._humans.delete(id);
            this._effects.delete(id);

            if(this._playerUnderCursor === id) this._playerUnderCursor = -1;
        }

        for(const id of this._snowballs)
        {
            if(activeIds.has(id)) continue;

            roomEngine.removeRoomObjectSnowWar(SNOWWAR_ROOM_ID, id, RoomEngine.SNOWWAR_SNOWBALL_CATEGORY);
            this._snowballs.delete(id);
        }

        for(let i = (this._splashes.length - 1); i >= 0; i--)
        {
            const splash = this._splashes[i];

            if((time - splash.time) < SPLASH_LIFE_SPAN_TIME) continue;

            roomEngine.removeRoomObjectSnowWar(SNOWWAR_ROOM_ID, splash.id, RoomEngine.SNOWWAR_SPLASH_CATEGORY);
            this._splashes.splice(i, 1);
        }

        this.setWalkSoundPlaying(anyoneRunning);

        if(ownHuman) this.setEffect(ownHuman.id, ((ownHuman.team === 1) ? EFFECT_BLUE_TEAM : EFFECT_RED_TEAM));
    }

    private updateHuman(human: ISnowWarHuman, ownHuman: ISnowWarHuman): void
    {
        const roomEngine = GetRoomEngine();
        const location = new Vector3d((human.x / TILE_WIDTH), (human.y / TILE_WIDTH), 0);
        const direction = (human.bodyDirection * 45);

        if(!this._humans.has(human.id))
        {
            const figure = GetAvatarRenderManager().createFigureContainer(human.figure);

            figure.updatePart('ch', ((human.team === 2) ? 20001 : 20000), [ 1 ]);
            figure.removePart('cc');

            roomEngine.addRoomObjectUser(SNOWWAR_ROOM_ID, human.id, location, new Vector3d(direction), direction, USER_TYPE, figure.getFigureString());
            roomEngine.updateRoomObjectUserPosture(SNOWWAR_ROOM_ID, human.id, 'std');
            roomEngine.updateRoomObjectUserAction(SNOWWAR_ROOM_ID, human.id, 'figure_is_playing_game', 1);

            this._humans.add(human.id);
        }
        else
        {
            roomEngine.updateRoomObjectUserLocation(SNOWWAR_ROOM_ID, human.id, location, location, false, 0, new Vector3d(direction), direction);
            roomEngine.updateRoomObjectUserPosture(SNOWWAR_ROOM_ID, human.id, human.posture);
            roomEngine.updateRoomObjectUserAction(SNOWWAR_ROOM_ID, human.id, 'figure_is_playing_game', ((human.posture !== 'swdieback') ? 1 : 0));
        }

        const roomObject = roomEngine.getRoomObjectUser(SNOWWAR_ROOM_ID, human.id);

        if(!roomObject) return;

        const sprite = (roomObject.visualization as IRoomObjectSpriteVisualization)?.getSprite(0);

        if(sprite) sprite.alpha = (human.isInvincible ? INVINCIBLE_ALPHA : 255);

        if(!ownHuman || (human.team === ownHuman.team)) return;

        const targeted = (this._playerUnderCursor === human.id) && !human.isInvincible && !human.isStunned;

        this.setEffect(human.id, (targeted ? EFFECT_CROSSHAIR : 0));
    }

    private updateSnowball(snowball: ISnowWarSnowball): void
    {
        const roomEngine = GetRoomEngine();
        const location = new Vector3d((snowball.x / TILE_WIDTH), (snowball.y / TILE_WIDTH), (snowball.z / TILE_HALFWIDTH));

        if(!this._snowballs.has(snowball.id))
        {
            roomEngine.addRoomObjectSnowWar(SNOWWAR_ROOM_ID, snowball.id, location, RoomEngine.SNOWWAR_SNOWBALL_CATEGORY);
            this._snowballs.add(snowball.id);
        }
        else
        {
            roomEngine.updateRoomObjectSnowWar(SNOWWAR_ROOM_ID, snowball.id, location, RoomEngine.SNOWWAR_SNOWBALL_CATEGORY);
        }
    }

    private updateFurnitureState(fuseObjectId: number, state: number): void
    {
        const roomObject = GetRoomEngine().getRoomObjectFloor(SNOWWAR_ROOM_ID, fuseObjectId);

        if(!roomObject || (roomObject.getState(0) === state)) return;

        roomObject.processUpdateMessage(new ObjectDataUpdateMessage(state, null));
    }

    private addSplash(event: Extract<SnowWarEngineEvent, { type: 'splash' }>): void
    {
        const roomEngine = GetRoomEngine();

        // A splash takes the id of the snowball it replaces; drop an older splash still showing under that id.
        roomEngine.removeRoomObjectSnowWar(SNOWWAR_ROOM_ID, event.snowballId, RoomEngine.SNOWWAR_SPLASH_CATEGORY);
        this._splashes = this._splashes.filter(splash => (splash.id !== event.snowballId));

        if(!roomEngine.addRoomObjectSnowWar(SNOWWAR_ROOM_ID, event.snowballId, new Vector3d((event.x / TILE_WIDTH), (event.y / TILE_WIDTH), (event.z / TILE_HALFWIDTH)), RoomEngine.SNOWWAR_SPLASH_CATEGORY)) return;

        this._splashes.push({ id: event.snowballId, time: Date.now() });
    }

    private setEffect(objectId: number, effectId: number): void
    {
        if((this._effects.get(objectId) ?? 0) === effectId) return;

        if(!GetRoomEngine().updateRoomObjectUserEffect(SNOWWAR_ROOM_ID, objectId, effectId)) return;

        this._effects.set(objectId, effectId);
    }

    private setWalkSoundPlaying(playing: boolean): void
    {
        if(playing === !!this._walkSound) return;

        if(!playing)
        {
            this._walkSound.pause();
            this._walkSound = null;

            return;
        }

        const url = (GetConfiguration().getValue<string>('sounds.url') ?? '').replace('%sample%', WALK_SOUND);

        this._walkSound = new Audio(url);
        this._walkSound.loop = true;
        this._walkSound.volume = GetSoundManager().systemVolume;
        this._walkSound.play().catch(() => null);
    }

    private notifyStageLoaded(): void
    {
        if(this._stageLoaded) return;

        this._stageLoaded = true;
        this._engine.notifyStageLoaded();
    }

    public handleClickOnTile(tileX: number, tileY: number, altKey: boolean, shiftKey: boolean): void
    {
        if(this._playerUnderCursor >= 0)
        {
            this._engine.clickHuman(this._playerUnderCursor, { altKey, shiftKey });

            return;
        }

        this._engine.clickTile(tileX, tileY, { altKey, shiftKey });
    }

    public handleClickOnFurniture(objectId: number): boolean
    {
        return this._engine.clickFuseObject(objectId);
    }

    public handleClickOnHuman(objectId: number, altKey: boolean, shiftKey: boolean): void
    {
        this._engine.clickHuman(objectId, { altKey, shiftKey });
    }

    public handleMouseOverOnHuman(objectId: number, altKey: boolean, shiftKey: boolean): void
    {
        this._playerUnderCursor = objectId;

        const human = this._engine.getObject(objectId);

        if(!human || (human.type !== SnowWarObjectType.HUMAN)) return;

        if(!GetConfigurationValue<boolean>('snowstorm.settings.show_user_names', true)) return;

        this._onPlayerName({ objectId, name: human.name, color: ((human.team === 1) ? NAME_COLOR_TEAM_1 : NAME_COLOR_TEAM_2), shownAt: Date.now() });
    }

    public handleMouseOutOnHuman(objectId: number): void
    {
        if(this._playerUnderCursor === objectId) this._playerUnderCursor = -1;
    }
}
