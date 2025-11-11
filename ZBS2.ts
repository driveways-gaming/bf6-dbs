const DEBUG = false;
class DBS {
    private spawners = new Map<number, mod.Spawner>();
    private botSpawnerAssignments = new Map<number, number>();
    private firstSpawnerPosition: mod.Vector;
    private firstSpawnerId: number;
    // private static lastSpawnerPosition = mod.CreateVector(-138.83, 138, 152.466);
    // private static spawnerCount = 64;
    private static spawnerSpacing = Math.sqrt(2);
    private spawnQueue = new Array<number>();
    public team: mod.Team;
    // public team2 = mod.GetTeam(2);
    public teamId: number;
    constructor(teamId: number, firstSpawnerId: number, numSpawners: number, rootSpatialObjectId: number, rootSpatialObjectIdVerticalOffset: number) {
        this.teamId = teamId;
        this.team = mod.GetTeam(teamId);
        let origin = mod.GetSpatialObject(rootSpatialObjectId);
        this.firstSpawnerPosition = mod.Add(mod.GetObjectPosition(origin), mod.CreateVector(0, rootSpatialObjectIdVerticalOffset, 0));
        if (DEBUG) {
            console.log("First spawner position: " + StrVector(this.firstSpawnerPosition));
        }
        this.firstSpawnerId = firstSpawnerId;
        for (let i = firstSpawnerId; i < firstSpawnerId + numSpawners; i++) {
            const spawner = mod.GetSpawner(i);
            if (spawner) {
                // mod.UnspawnAllAIsFromAISpawner(spawner);
                mod.AISetUnspawnOnDead(spawner, true);
                mod.SetUnspawnDelayInSeconds(spawner, 0);
                this.spawners.set(i, spawner);
                // DBS.spawnBot(spawner);
                this.spawnBotFromSpawnerId(i);
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

    pushSpawn(playerId: number): boolean {
        const spawnerId = this.botSpawnerAssignments.get(playerId);
        if (spawnerId) {
            if (DEBUG) {
                console.log("Pushing spawn for player " + playerId + " to spawner " + spawnerId);
            }
            // this.spawnQueue.push(spawnerId);
            // insert in order of distance from first spawner
            // this.spawnQueue.splice(this.spawnQueue.findIndex(id => id > spawnerId), 0, spawnerId);
            // the other direction
            const index = this.spawnQueue.findIndex(id => id < spawnerId);
            if (index !== -1) {
                this.spawnQueue.splice(index, 0, spawnerId);
            } else {
                this.spawnQueue.push(spawnerId);
            }
            if (DEBUG) {
                console.log("Spawn queue: " + this.spawnQueue.join(", "));
            }
            this.botSpawnerAssignments.delete(playerId);
            return true;
        } else {
            console.log("Failed to get spawner for player " + playerId);
            return false;
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
                this.spawnBotFromSpawnerId(spawnerId);
                // const spawner = this.spawners.get(spawnerId);
                // if (spawner) {
                //     if (DEBUG) {
                //         console.log("Spawning bot on spawner " + spawnerId);
                //     }
                //     DBS.spawnBot(spawner);
                // } else {
                //     if (DEBUG) {
                //         console.log("Failed to get spawner for bot " + spawnerId + " not found in spawners");
                //     }
                // }
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

    // spawnBot(playerId: number) {
    //     const spawnerId = this.botSpawnerAssignments.get(playerId);
    //     if (spawnerId) {
    //         this.spawnBotFromSpawnerId(spawnerId);
    //         // const spawner = this.spawners.get(spawnerId);
    //         // if (spawner) {
    //         //     if (DEBUG) {
    //         //         console.log("Spawning bot on spawner " + spawnerId);
    //         //     }
    //         //     DBS.spawnBot(spawner);
    //         // } else {
    //         //     console.log("Failed to get spawner for bot " + playerId);
    //         // }
    //     } else {
    //         if (DEBUG) {
    //             console.log("Failed to get spawner for bot " + playerId + " not found in assignments");
    //         }
    //     }
    // }

    private spawnBotFromSpawnerId(spawnerId: number) {
        const spawner = this.spawners.get(spawnerId);
        if (spawner) {
            mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, this.team);
            // if (spawnerId < 132) {

            //     mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, this.team2);
            // } else {
            //     mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, this.team1);
            // }
        } else {
            console.log("Failed to get spawner for bot " + spawnerId);
        }
    }
    assignBotToSpawner(bot: mod.Player): boolean {
        const botTeamId = mod.GetObjId(mod.GetTeam(bot));
        if (botTeamId !== this.teamId) {
            return false;
        }

        const botId = mod.GetObjId(bot);
        // check if spawner is already assigned to a bot
        // const assignedSpawnerId = this.botSpawnerAssignments.get(botId);
        // if (assignedSpawnerId) {
        //     if (DEBUG) {
        //         console.log("Bot " + botId + " already assigned to spawner " + assignedSpawnerId);
        //     }
        //     return true;
        // }

        const botPosition = mod.GetObjectPosition(bot);
        const distance = mod.DistanceBetween(this.firstSpawnerPosition, botPosition);
        const spawnerId = Math.round(distance / DBS.spawnerSpacing) + this.firstSpawnerId;
        console.log(`Bot ${botId} team ${this.teamId}: distance=${distance}, firstSpawnerId=${this.firstSpawnerId}, calculated spawnerId=${spawnerId}`);
        console.log(`From ${StrVector(this.firstSpawnerPosition)} to ${StrVector(botPosition)}`);
        const spawner = this.spawners.get(spawnerId);
        if (spawner) {
            this.botSpawnerAssignments.set(botId, spawnerId);
            if (DEBUG) {
                console.log("Assigned bot " + botId + " to spawner " + spawnerId + " at " + StrVector(botPosition));
            }
            return true;
        } else {
            console.log("Failed to get spawner for bot " + botId + " not found in spawners " + spawnerId);
            return false;
        }
    }
    // private static spawnBot(spawner: mod.Spawner) {
    //     mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, this.team2);
    // }
}
// let instance: DBS | null = null;
let team1Instance: DBS | null = null;
let team2Instance: DBS | null = null;

function resetInstances() {
    team1Instance = new DBS(1, 100, 32, 1100, 1);
    team2Instance = new DBS(2, 132, 32, 1101, 1);
}
let signalBlock: SignalBlock | null = null;
export function OnGameModeStarted() {
    console.log("OnGameModeStarted");
    // instance = new DBS();
    resetInstances();
    signalBlock = new SignalBlock(2);
}
// const team1 = mod.GetTeam(1);
// const team2 = mod.GetTeam(2);
const TICK_RATE = 30; // 30 for portal, 60 for base modes
let tick = 0;

function updateInstance(instance: DBS | null) {
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
}
export function OngoingGlobal() {

    updateInstance(team1Instance);
    updateInstance(team2Instance);
    


    // if (tick % signalBlockToSpawnInterval() === 0) {
    //     if (instance) {
    //         if (DEBUG) {
    //             console.log("Next spawn");
    //         }
    //         instance.nextSpawn();
    //     }
    // }
    tick++;
}

function signalBlockToSpawnInterval() {
    if (signalBlock) {
        switch (signalBlock.level) {
            case 0:
                return -1;
            case 1:
                return 1;
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
export function OnPlayerDied(player: mod.Player, eventOtherPlayer: mod.Player, eventDeathType: mod.DeathType, eventWeaponUnlock: mod.WeaponUnlock) {
    const playerId = mod.GetObjId(player);
    livePlayers.delete(playerId);
}
export function OnPlayerLeaveGame(playerId: number) {
    if (bots.has(playerId)) {
        bots.delete(playerId);
        if (team1Instance && team1Instance.pushSpawn(playerId)) {
            if (DEBUG) {
                console.log("Pushed spawn for player " + playerId + " to team 1");
            }
        } else if (team2Instance && team2Instance.pushSpawn(playerId)) {
            if (DEBUG) {
                console.log("Pushed spawn for player " + playerId + " to team 2");
            }
        } else {
            console.log("Failed to push spawn for player " + playerId);
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
        // if (instance) {
        //     instance.assignBotToSpawner(player);
        // }

        if (team1Instance && team1Instance.assignBotToSpawner(player)) {
            if (DEBUG) {
                console.log("Assigned bot " + playerId + " to team 1");
            }
        } else if (team2Instance && team2Instance.assignBotToSpawner(player)) {
            if (DEBUG) {
                console.log("Assigned bot " + playerId + " to team 2");
            }
        } else {
            console.log("Failed to assign bot " + playerId + " to spawner");
        }



        if (DEBUG) {
            console.log("Bot " + playerId + " deployed");
        }
    } else {
        const playerId = mod.GetObjId(player);
        // const playerTeam = mod.GetTeam(player);
        // if (mod.GetObjId(playerTeam) !== 1) {
        //     mod.SetTeam(player, mod.GetTeam(1));
        //     mod.Kill(player);
        //     if (DEBUG) {
        //         console.log("Player " + playerId + " set to team 1");
        //     }
        // }
        mod.SetPlayerMaxHealth(player, 500);
        livePlayers.add(playerId);
    }
}
export function OnPlayerInteract(player: mod.Player, eventInteractPoint: mod.InteractPoint) {
    const interactPointId = mod.GetObjId(eventInteractPoint);
    if (interactPointId === 800) {
        mod.EndGameMode(player);
    } else if (interactPointId === 801) {
        if (team1Instance && team2Instance) {
            console.log("Restarting game");
            resetInstances();
        } else {
            console.log("New game");
            resetInstances();
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
    if (interactPointId === 804 && team1Instance && team2Instance) {
        const playerTeamId = mod.GetObjId(mod.GetTeam(player));
        if (playerTeamId === 1) {
            mod.SetTeam(player, team2Instance.team);
            mod.Kill(player);
        } else if (playerTeamId === 2) {
            mod.SetTeam(player, team1Instance.team);
            mod.Kill(player);
        } else {
            console.log("Player " + mod.GetObjId(player) + " is not on a team");
        }
    }
}