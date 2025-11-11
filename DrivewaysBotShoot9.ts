class DBS {
    private spawners = new Map<number, mod.Spawner>();
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
        const spawnerId = playerId % this.spawners.size + 100;
        const spawner = this.spawners.get(spawnerId);
        if (spawner) {
            console.log("Spawning bot on spawner " + spawnerId);
            DBS.spawnBot(spawner);
        } else {
            console.log("Failed to get spawner for player " + playerId);
        }
    }

    private static spawnBot(spawner: mod.Spawner) {
        mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team2);
    }
}
let instance: DBS | null = null;
export function OnGameModeStarted() {
    instance = new DBS();
    // setup();
}
const team2 = mod.GetTeam(2); // AI bots
let tick = 0;
export function OngoingGlobal() {
    tick++;
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
        // AI bot: assign to slot and position
        mod.AIEnableTargeting(player, false);
        mod.AIEnableShooting(player, false);
        mod.SetPlayerMaxHealth(player, 1);
        // PositionBot(player);
        const playerId = mod.GetObjId(player);
        bots.add(playerId);
    } else {
        // Human player: add to team 1 and track as live
        const playerId = mod.GetObjId(player);
        const playerTeam = mod.GetTeam(player);
        if (mod.GetObjId(playerTeam) !== 1) {
            mod.SetTeam(player, mod.GetTeam(1));
            mod.Kill(player);
            console.log("Player " + playerId + " set to team 1");
        } else {
            console.log("Player " + playerId + " is already on team 1");
        }
        // mod.SetTeam(player, mod.GetTeam(1));
        mod.SetPlayerMaxHealth(player, 500);
        // const playerId = mod.GetObjId(player);
        livePlayers.add(playerId);
    }
}
export function OnPlayerLeaveGame(playerId: number) {
    // livePlayers.delete(playerId);
    if (bots.has(playerId)) {
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