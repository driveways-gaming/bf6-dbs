interface BotWithDistance {
    bot: mod.Player;
    distance: number;
}
class DBS {
    private spawners = new Map<number, mod.Spawner>();
    private botSpawnerAssignments = new Map<number, number>();
    private lastAssignAttempt = 30;
    private lastAssignSuccess = -300;
    private static originVector = mod.CreateVector(-201.83, 138, 215.466);
    constructor() {
        for (let i = 100; i <= 163; i++) {
            const spawner = mod.GetSpawner(i);
            if (spawner) {
                mod.AISetUnspawnOnDead(spawner, true);
                mod.SetUnspawnDelayInSeconds(spawner, 0);
                this.spawners.set(i, spawner);
                DBS.spawnBot(spawner);
            }
        }
    }
    spawnBot(playerId: number) {
        const spawnerId = this.botSpawnerAssignments.get(playerId);
        if (spawnerId) {
            const spawner = this.spawners.get(spawnerId);
            if (spawner) {
                // console.log("Spawning bot on spawner " + spawnerId + " for player " + playerId);
                DBS.spawnBot(spawner);
            } else {
                // console.log("Failed to get spawner for player " + playerId + " on spawner " + spawnerId);
            }
        } else {
            // console.log("Failed to get spawner for player " + playerId + " not found in assignments");
        }  
    }

    tryAssignBots() {
        // check how long ago we last tried to assign bots
        if (tick - this.lastAssignAttempt < 30) {
            // console.log("Last assign attempt was less than 30 ticks ago");
            return;
        }
        // console.log("Trying to assign bots");
        this.lastAssignAttempt = tick;
        // check if we currently have assignments
        if (tick - this.lastAssignSuccess < 300) {
            // console.log("Last assign success was less than 300 ticks ago");
            return;
        }
        // check if all bots are spawned
        const players = mod.AllPlayers();
        const n = mod.CountOf(players);
        let botCount = 0;
        const bots: mod.Player[] = [];
        for (let i = 0; i < n; i++) {
            const player = mod.ValueInArray(players, i);
            bots.push(player);
            if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
                botCount++;
            }
        }
        if (botCount !== this.spawners.size) {
            // console.log("Bot count mismatch: " + botCount + " bots vs " + this.spawners.size + " spawners");
            return;
        }
        // console.log("Assigning bots to spawners");
        this.assignBotsToSpawners(bots);
        // console.log("Bots assigned to spawners");
        this.lastAssignSuccess = tick;
    }

    assignBotsToSpawners(bots: mod.Player[]) {
        // order bots by distance to origin vector
        
        const botsWithDistance: BotWithDistance[] = bots.map(bot => ({
            bot: bot,
            distance: mod.DistanceBetween(DBS.originVector, mod.GetObjectPosition(bot))
        }));
        botsWithDistance.sort((a, b) => a.distance - b.distance);
        // for (const botWithDistance of botsWithDistance) {
        //     const botId = mod.GetObjId(botWithDistance.bot);
        //     const spawnerId = botWithDistance.distance % this.spawners.size + 100;
        //     this.botSpawnerAssignments.set(botId, spawnerId);
        //     console.log("Assigning bot " + botId + " to spawner " + spawnerId);
        // }
        for (const [index, botWithDistance] of botsWithDistance.entries()) {
            const botId = mod.GetObjId(botWithDistance.bot);
            const spawnerId = index % this.spawners.size + 100;
            this.botSpawnerAssignments.set(botId, spawnerId);
            // console.log("Assigning bot " + botId + " to spawner " + spawnerId);
        }

        // for (const [spawnerId, spawner] of this.spawners.entries()) {

        //     // const spawnerPosition = mod.GetObjectPosition(spawner);
        //     // console.log("Spawner position: " + mod.XComponentOf(spawnerPosition) + ", " + mod.ZComponentOf(spawnerPosition));
        //     // const closestPlayer = mod.ClosestPlayerTo(spawnerPosition, team2);
        //     // if (closestPlayer) {
        //     //     console.log("Closest player: " + mod.XComponentOf(mod.GetObjectPosition(closestPlayer)) + ", " + mod.ZComponentOf(mod.GetObjectPosition(closestPlayer)));
        //     //     const playerId = mod.GetObjId(closestPlayer);
        //     //     this.botSpawnerAssignments.set(playerId, spawnerId);
        //     //     console.log("Assigning bot " + playerId + " to spawner " + spawnerId);
        //     // } else {
        //     //     console.log("No player found for spawner " + spawnerId);
        //     // }
        // }
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
    if (instance) {
        instance.tryAssignBots();
    }
}

export function OnPlayerDied(player: mod.Player, eventOtherPlayer: mod.Player, eventDeathType: mod.DeathType, eventWeaponUnlock: mod.WeaponUnlock) {
    const playerId = mod.GetObjId(player);
    if (bots.has(playerId)) {
        // console.log("Bot died: " + playerId);
        // bots.delete(playerId);
    }
}
export function OnPlayerJoined(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    if (bots.has(playerId)) {
        // console.log("Bot joined game: " + playerId);
        bots.delete(playerId);
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
    } else {
        const playerId = mod.GetObjId(player);
        const playerTeam = mod.GetTeam(player);
        if (mod.GetObjId(playerTeam) !== 1) {
            mod.SetTeam(player, mod.GetTeam(1));
            mod.Kill(player);
            // console.log("Player " + playerId + " set to team 1");
        } else {
            // console.log("Player " + playerId + " is already on team 1");
        }
        mod.SetPlayerMaxHealth(player, 500);
        livePlayers.add(playerId);
    }
}
export function OnPlayerLeaveGame(playerId: number) {
    livePlayers.delete(playerId);
    if (bots.has(playerId)) {
        // console.log("Bot left game: " + playerId);
        bots.delete(playerId);
        if (instance) {
            instance.spawnBot(playerId);
        }
    }
}
export function OnPlayerInteract(player: mod.Player, eventInteractPoint: mod.InteractPoint) {
    const interactPointId = mod.GetObjId(eventInteractPoint);
    if (interactPointId === 800) {
        // Interact point 800: end game
        mod.EndGameMode(player);
    } else if (interactPointId === 801) {
        // Interact point 801: restart/setup
        // setup();
        if (instance) {
            console.log("Restarting game");
            instance = new DBS();
        } else {
            console.log("New game");
            instance = new DBS();
        }
    }
}