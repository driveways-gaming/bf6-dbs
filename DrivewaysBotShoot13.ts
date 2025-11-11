const DEBUG = false;
class DBS {
    private spawners = new Map<number, mod.Spawner>();
    private botSpawnerAssignments = new Map<number, number>();
    private static firstSpawnerPosition = mod.CreateVector(-201.83, 138, 215.466);
    private static lastSpawnerPosition = mod.CreateVector(-138.83, 138, 152.466);
    private static spawnerCount = 64;
    private static spawnerSpacing = mod.DistanceBetween(DBS.firstSpawnerPosition, DBS.lastSpawnerPosition) / DBS.spawnerCount;
    constructor() {
        for (let i = 100; i < 100 + DBS.spawnerCount; i++) {
            const spawner = mod.GetSpawner(i);
            if (spawner) {
                mod.AISetUnspawnOnDead(spawner, true);
                mod.SetUnspawnDelayInSeconds(spawner, 0);
                this.spawners.set(i, spawner);
                DBS.spawnBot(spawner);
                if (DEBUG) {
                    console.log("Spawned bot on spawner " + i + " at " + StrVector(mod.GetObjectPosition(spawner)));
                }
            }
        }
    }
    spawnBot(playerId: number) {
        const spawnerId = this.botSpawnerAssignments.get(playerId);
        if (spawnerId) {
            const spawner = this.spawners.get(spawnerId);
            if (spawner) {
                DBS.spawnBot(spawner);
            } else {
                console.log("Failed to get spawner for bot " + playerId);
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
        }
    }
    private static spawnBot(spawner: mod.Spawner) {
        mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team2);
    }
}
let instance: DBS | null = null;
export function OnGameModeStarted() {
    console.log("OnGameModeStarted");
    instance = new DBS();
}
const team2 = mod.GetTeam(2);
let tick = 0;
export function OngoingGlobal() {
    tick++;
}
function StrVector(vector: mod.Vector) {
    return "(" + mod.XComponentOf(vector) + ", " + mod.YComponentOf(vector) + ", " + mod.ZComponentOf(vector) + ")";
}
// export function OnPlayerDied(player: mod.Player, eventOtherPlayer: mod.Player, eventDeathType: mod.DeathType, eventWeaponUnlock: mod.WeaponUnlock) {
//     const playerId = mod.GetObjId(player);
//     if (bots.has(playerId)) {
//         // console.log("Bot died: " + playerId);
//         // bots.delete(playerId);
//     }
// }
export function OnPlayerLeaveGame(playerId: number) {
    if (bots.has(playerId)) {
        bots.delete(playerId);
        if (instance) {
            instance.spawnBot(playerId);
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
}