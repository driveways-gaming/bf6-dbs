const DEBUG = false;
class DBS {
    private spawners = new Map<number, mod.Spawner>();
    private botSpawnerAssignments = new Map<number, number>();
    private static firstSpawnerPosition = mod.CreateVector(-201.83, 138, 215.466);
    private static lastSpawnerPosition = mod.CreateVector(-138.83, 138, 152.466);
    private static spawnerCount = 64;
    private static spawnerSpacing = mod.DistanceBetween(DBS.firstSpawnerPosition, DBS.lastSpawnerPosition) / DBS.spawnerCount;
    private spawnQueue = new Array<number>();
    constructor() {
        for (let i = 100; i < 100 + DBS.spawnerCount; i++) {
            const spawner = mod.GetSpawner(i);
            if (spawner) {
                // mod.UnspawnAllAIsFromAISpawner(spawner);
                mod.AISetUnspawnOnDead(spawner, true);
                mod.SetUnspawnDelayInSeconds(spawner, 0);
                this.spawners.set(i, spawner);
                DBS.spawnBot(spawner);
                if (DEBUG) {
                    console.log("Spawned bot on spawner " + i);
                }
            } else {
                if (DEBUG) {
                    console.log("Failed to get spawner for spawner " + i);
                }
            }
        }
    }

    pushSpawn(playerId: number) {
        const spawnerId = this.botSpawnerAssignments.get(playerId);
        if (spawnerId) {
            if (DEBUG) {
                console.log("Pushing spawn for player " + playerId + " to spawner " + spawnerId);
            }
            // this.spawnQueue.push(spawnerId);
            // insert in order of distance from first spawner
            // this.spawnQueue.splice(this.spawnQueue.findIndex(id => id > spawnerId), 0, spawnerId);
            // the other direction
            this.spawnQueue.splice(this.spawnQueue.findIndex(id => id < spawnerId), 0, spawnerId);
        } else {
            console.log("Failed to get spawner for player " + playerId);
        }
    }
    nextSpawn() {
        if (this.spawnQueue.length > 0) {
            // const spawnerId = this.spawnQueue.shift();
            const spawnerId = this.spawnQueue.pop();
            if (spawnerId) {
                if (DEBUG) {
                    console.log("Next spawn for spawner " + spawnerId);
                }
                const spawner = this.spawners.get(spawnerId);
                if (spawner) {
                    if (DEBUG) {
                        console.log("Spawning bot on spawner " + spawnerId);
                    }
                    DBS.spawnBot(spawner);
                } else {
                    if (DEBUG) {
                        console.log("Failed to get spawner for bot " + spawnerId + " not found in spawners");
                    }
                }
            }
        } else {
            if (DEBUG) {
                console.log("Spawn queue is empty");
            }
        }
    }

    drainSpawnQueue() {
        while (this.spawnQueue.length > 0) {
            this.nextSpawn();
        }
        if (DEBUG) {
            console.log("Spawn queue drained");
        }
    }

    spawnBot(playerId: number) {
        const spawnerId = this.botSpawnerAssignments.get(playerId);
        if (spawnerId) {
            const spawner = this.spawners.get(spawnerId);
            if (spawner) {
                if (DEBUG) {
                    console.log("Spawning bot on spawner " + spawnerId);
                }
                DBS.spawnBot(spawner);
            } else {
                console.log("Failed to get spawner for bot " + playerId);
            }
        } else {
            if (DEBUG) {
                console.log("Failed to get spawner for bot " + playerId + " not found in assignments");
            }
        }
    }
    assignBotToSpawner(bot: mod.Player) {
        const botPosition = mod.GetObjectPosition(bot);
        const distance = mod.DistanceBetween(DBS.firstSpawnerPosition, botPosition);
        const spawnerId = Math.floor(distance / DBS.spawnerSpacing) + 100;
        const spawner = this.spawners.get(spawnerId);
        if (spawner) {
            this.botSpawnerAssignments.set(mod.GetObjId(bot), spawnerId);
            if (DEBUG) {
                console.log("Assigned bot " + mod.GetObjId(bot) + " to spawner " + spawnerId + " at " + StrVector(botPosition));
            }
        } else {
            if (DEBUG) {
                console.log("Failed to get spawner for bot " + mod.GetObjId(bot) + " not found in spawners " + spawnerId);
            }
        }
    }
    private static spawnBot(spawner: mod.Spawner) {
        mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team2);
    }
}
let instance: DBS | null = null;
let signalBlock: SignalBlock | null = null;
export function OnGameModeStarted() {
    console.log("OnGameModeStarted");
    instance = new DBS();
    signalBlock = new SignalBlock(2);
}
const team2 = mod.GetTeam(2);
const TICK_RATE = 30; // 30 for portal, 60 for base modes
let tick = 0;
export function OngoingGlobal() {

    if (instance) {
        const spawnInterval = signalBlockToSpawnInterval();
        if (spawnInterval === -1) {
            instance.drainSpawnQueue();
        } else {
            if (tick % spawnInterval === 0) {
                instance.nextSpawn();
            }
        }
    }
    


    if (tick % signalBlockToSpawnInterval() === 0) {
        if (instance) {
            if (DEBUG) {
                console.log("Next spawn");
            }
            instance.nextSpawn();
        }
    }
    tick++;
}

function signalBlockToSpawnInterval() {
    if (signalBlock) {
        switch (signalBlock.level) {
            case 0:
                return -1;
            case 1:
                return 0;
            case 2:
                return 2;
            case 3:
                return 15;
            case 4:
                return 30;
            default:
                return -1;
        }
    } else {
        return 2;
    }
}
// //-189.9 142.044 224.659
// const signalBlockOrigin = mod.CreateVector(-189.9, 142.044, 224.659);
// const signalBlockLevels = 5;
// let currentSignalBlockLevel = 0;
// function increaseSignalBlock() {

// }
// function decreaseSignalBlock() {

// }

class SignalBlock {
    private static origin = mod.CreateVector(-189.9, 142.044, 224.659);
    private static spatialObjectId = 1000;
    private static levelSpacing = 1;
    private static levelCount = 5;
    private object: mod.Object;
    public level = 0;
    constructor(level: number) {
        this.object = mod.GetSpatialObject(SignalBlock.spatialObjectId);
        this.setLevel(level);
    }
    setLevel(level: number) {
        this.level = level;
        const destination = mod.Add(SignalBlock.origin, mod.CreateVector(0, this.level * SignalBlock.levelSpacing, 0));
        const delta = mod.Subtract(destination, mod.GetObjectPosition(this.object));
        mod.MoveObject(this.object, delta);
        if (DEBUG) {
            console.log("Signal block level set to " + this.level);
        }
    }
    increaseLevel() {
        if (this.level < SignalBlock.levelCount - 1) {
            this.setLevel(this.level + 1);
        }
    }
    decreaseLevel() {
        if (this.level > 0) {
            this.setLevel(this.level - 1);
        }
    }
}

function StrVector(vector: mod.Vector) {
    return "(" + mod.XComponentOf(vector) + ", " + mod.YComponentOf(vector) + ", " + mod.ZComponentOf(vector) + ")";
}
export function OnPlayerLeaveGame(playerId: number) {
    if (bots.has(playerId)) {
        bots.delete(playerId);
        if (instance) {
            // instance.spawnBot(playerId);
            instance.pushSpawn(playerId);
        }
        if (DEBUG) {
            console.log("Bot " + playerId + " left game");
        }
    }
}
export function OngoingPlayer(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    let pTick = tick + playerId;
    if (pTick % 15 == 0) {
        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
            if (livePlayers.has(playerId)) {
                mod.SetInventoryAmmo(player, mod.InventorySlots.PrimaryWeapon, 200);
                mod.SetInventoryAmmo(player, mod.InventorySlots.SecondaryWeapon, 200);
            }
        }
    }
    if (pTick % 300 === 0) {
        if (DEBUG) {
            console.log("Player " + playerId + " is at " + StrVector(mod.GetObjectPosition(player)));
        }
    }
}
const livePlayers = new Set<number>();
const bots = new Set<number>();
export function OnPlayerDeployed(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        mod.AIEnableTargeting(player, false);
        mod.AIEnableShooting(player, false);
        mod.SetPlayerMaxHealth(player, 1);
        const playerId = mod.GetObjId(player);
        // console.log("Bot deployed: " + playerId);
        bots.add(playerId);
        if (instance) {
            instance.assignBotToSpawner(player);
        }
        if (DEBUG) {
            console.log("Bot " + playerId + " deployed");
        }
    } else {
        const playerId = mod.GetObjId(player);
        const playerTeam = mod.GetTeam(player);
        if (mod.GetObjId(playerTeam) !== 1) {
            mod.SetTeam(player, mod.GetTeam(1));
            mod.Kill(player);
            if (DEBUG) {
                console.log("Player " + playerId + " set to team 1");
            }
        }
        mod.SetPlayerMaxHealth(player, 500);
        livePlayers.add(playerId);
    }
}
export function OnPlayerInteract(player: mod.Player, eventInteractPoint: mod.InteractPoint) {
    const interactPointId = mod.GetObjId(eventInteractPoint);
    if (interactPointId === 800) {
        mod.EndGameMode(player);
    } else if (interactPointId === 801) {
        if (instance) {
            console.log("Restarting game");
            instance = new DBS();
        } else {
            console.log("New game");
            instance = new DBS();
        }
    }
    if (interactPointId === 802) {
        if (signalBlock) {
            signalBlock.increaseLevel();
        }
    }
    if (interactPointId === 803) {
        if (signalBlock) {
            signalBlock.decreaseLevel();
        }
    }
}