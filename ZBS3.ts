const DEBUG = false;
class DBS {
    private spawners = new Map<number, mod.Spawner>();
    private botSpawnerAssignments = new Map<number, number>();
    private firstSpawnerPosition: mod.Vector;
    private firstSpawnerId: number;
    private static spawnerSpacing = Math.sqrt(2);
    private spawnQueue = new Array<number>();
    public team: mod.Team;
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
                mod.AISetUnspawnOnDead(spawner, true);
                mod.SetUnspawnDelayInSeconds(spawner, 0);
                this.spawners.set(i, spawner);
                if (this.canSpawnBot()) {
                    this.spawnBotFromSpawnerId(i);
                    if (DEBUG) {
                        console.log("Spawned bot on spawner " + i);
                    }
                } else {
                    if (DEBUG) {
                        console.log("Cannot spawn bot from spawner " + i + " because bot limit reached");
                    }
                }
            } else {
                if (DEBUG) {
                    console.log("Failed to get spawner for spawner " + i);
                }
            }
        }
    }

    canSpawnBot(): boolean {
        if (!bots) return true;
        return bots.count(this.teamId) < getBotLimit(this.teamId);
    }

    pushSpawn(playerId: number): boolean {
        const spawnerId = this.botSpawnerAssignments.get(playerId);
        if (spawnerId) {
            if (DEBUG) {
                console.log("Pushing spawn for player " + playerId + " to spawner " + spawnerId);
            }
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
        if (this.spawnQueue.length > 0 && this.canSpawnBot()) {
            const spawnerId = this.spawnQueue.pop();
            if (spawnerId) {
                if (DEBUG) {
                    console.log("Next spawn for spawner " + spawnerId);
                }
                this.spawnBotFromSpawnerId(spawnerId);
            }
        }
    }

    drainSpawnQueue() {
        while (this.spawnQueue.length > 0 && this.canSpawnBot()) {
            this.nextSpawn();
        }
        if (DEBUG) {
            console.log("Spawn queue drained");
        }
    }

    private spawnBotFromSpawnerId(spawnerId: number) {
        const spawner = this.spawners.get(spawnerId);
        if (spawner) {
            mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, this.team);
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

    despawnExcessBots() {
        const limit = getBotLimit(this.teamId);
        if (!bots) return;
        
        const currentCount = bots.count(this.teamId);
        const excessCount = currentCount - limit;
        
        if (excessCount > 0) {
            const assignments = Array.from(this.botSpawnerAssignments.entries())
                .sort((a, b) => b[1] - a[1]);
            
            let marked = 0;
            for (const [botId, spawnerId] of assignments) {
                if (marked >= excessCount) break;
                
                bots.markForDeath(botId);
                console.log(`Marked bot ${botId} from spawner ${spawnerId} for death (team ${this.teamId})`);
                marked++;
            }
        }
    }

    fillToLimit() {
        while (this.canSpawnBot() && this.spawnQueue.length > 0) {
            const spawnerId = this.spawnQueue.pop();
            if (spawnerId) {
                this.spawnBotFromSpawnerId(spawnerId);
                console.log(`Filled bot slot from spawner ${spawnerId} (team ${this.teamId})`);
            }
        }
    }
}

class TeamPlayers {
    team1 = new Set<number>();
    team2 = new Set<number>();
    markedForDeath = new Set<number>();
    
    add(playerId: number, teamId: number) {
        (teamId === 1 ? this.team1 : this.team2).add(playerId);
    }
    
    remove(playerId: number) {
        this.team1.delete(playerId);
        this.team2.delete(playerId);
        this.markedForDeath.delete(playerId);
    }
    
    count(teamId: number): number {
        return (teamId === 1 ? this.team1 : this.team2).size;
    }
    
    botLimit(teamId: number): number {
        return Math.max(0, 31 - this.count(teamId));
    }
    
    has(playerId: number): boolean {
        return this.team1.has(playerId) || this.team2.has(playerId);
    }
    
    markForDeath(playerId: number) {
        this.markedForDeath.add(playerId);
    }
    
    isMarkedForDeath(playerId: number): boolean {
        return this.markedForDeath.has(playerId);
    }
    
    unmarkForDeath(playerId: number) {
        this.markedForDeath.delete(playerId);
    }
}
function getBotLimit(teamId: number): number {
    if (!humanPlayers) return 32;
    return Math.max(0, 31 - humanPlayers.count(teamId));
}
let team1Instance: DBS | null = null;
let team2Instance: DBS | null = null;
let signalBlock: SignalBlock | null = null;

let humanPlayers: TeamPlayers | null = null;
let bots: TeamPlayers | null = null;
function resetInstances() {
    team1Instance = new DBS(1, 100, 32, 1100, 1);
    team2Instance = new DBS(2, 132, 32, 1101, 1);
    humanPlayers = new TeamPlayers();
    bots = new TeamPlayers();
    signalBlock = new SignalBlock(2);
}
export function OnGameModeStarted() {
    console.log("OnGameModeStarted");
    resetInstances();
}
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
class SignalBlock {
    private static spatialObjectId = 1000;
    private static levelSpacing = 1;
    private static levelCount = 5;
    private object: mod.Object;
    private origin: mod.Vector;
    public level = 0;
    constructor(level: number) {
        this.object = mod.GetSpatialObject(SignalBlock.spatialObjectId);
        this.origin = mod.GetObjectPosition(this.object);
        this.setLevel(level);
    }
    setLevel(level: number) {
        this.level = level;
        const destination = mod.Add(this.origin, mod.CreateVector(0, this.level * SignalBlock.levelSpacing, 0));
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
    humanPlayers?.remove(playerId);
}
export function OnPlayerLeaveGame(playerId: number) {
    if (bots?.has(playerId)) {
        bots?.remove(playerId);
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
    } else {
        humanPlayers?.remove(playerId);
        team1Instance?.fillToLimit();
        team2Instance?.fillToLimit();
    }
}
export function OngoingPlayer(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    
    if (bots?.isMarkedForDeath(playerId)) {
        mod.Kill(player);
        bots.unmarkForDeath(playerId);
        return;
    }
    
    let pTick = tick + playerId;
    if (pTick % 15 == 0) {
        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
            if (humanPlayers?.has(playerId)) {
                mod.SetInventoryAmmo(player, mod.InventorySlots.PrimaryWeapon, 200);
                mod.SetInventoryAmmo(player, mod.InventorySlots.SecondaryWeapon, 200);
            }
        }
    }
}
export function OnPlayerDeployed(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        mod.AIEnableTargeting(player, false);
        mod.AIEnableShooting(player, false);
        mod.SetPlayerMaxHealth(player, 1);
        const playerId = mod.GetObjId(player);
        bots?.add(playerId, mod.GetObjId(mod.GetTeam(player)));
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
        const teamId = mod.GetObjId(mod.GetTeam(player));
        humanPlayers?.add(playerId, teamId);
        mod.SetPlayerMaxHealth(player, 500);
        
        const instance = teamId === 1 ? team1Instance : team2Instance;
        instance?.despawnExcessBots();
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