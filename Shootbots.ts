

let gameStarted = false;
export function OnGameModeStarted() {
    console.log("OnGameModeStarted");
    mod.SetAIToHumanDamageModifier(0);
    for (let i = 100; i <= 163; i++) {
        mod.AISetUnspawnOnDead(mod.GetSpawner(i), true);
        mod.SetUnspawnDelayInSeconds(mod.GetSpawner(i), 0.1);
    }
    gameStarted = true;
}

let tick = 0;
export function OngoingGlobal() {
    if (gameStarted && tick % 30 == 0) {
        manageTeamSpawning();
    }
    tick++;
}


let currentSpawnerId = 100;
function nextSpawner(): mod.Spawner {
    currentSpawnerId++;
    if (currentSpawnerId > 163) {
        currentSpawnerId = 100;
    }
    return mod.GetSpawner(currentSpawnerId);
}
const team2 = mod.GetTeam(2);
let pendingSpawns = 0;
function manageTeamSpawning() {
    // let team1Count = 0;
    // let team2Count = 0;
    const players = mod.AllPlayers();
    const n = mod.CountOf(players) + pendingSpawns;
    const now = mod.GetMatchTimeElapsed();
    for (let i = 0; i < n; i++) {
        const player = mod.ValueInArray(players, i);
        if (player) {
            const playerId = mod.GetObjId(player);
            const joinTime = JoinTimes.get(playerId);
            if (joinTime && now - joinTime > 10) {
                console.log("Unspawning player ", playerId);
                mod.UnspawnObject(player);
                JoinTimes.delete(playerId);
                pendingSpawns--;
            }
        } else {
            console.log("No player at index: " + i);
        }


    }

    if (n < 64) {
        for (let i = 0; i < Math.min(63, 64 - n); i++) {
            const spawner = nextSpawner();
            if (spawner) {
                console.log("Spawning AI for team 2");
                mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team2);
                pendingSpawns++;
            }
            else {
                console.log("Failed to get spawner for team 2");
            }
        }
    }
    console.log("Pending spawns: ", pendingSpawns);
    // console.log("Team 1 count: ", team1Count);
    // console.log("Team 2 count: ", team2Count);
}

export function OnPlayerDeployed(player: mod.Player) {
    console.log("Player deployed: ", mod.GetObjId(player));
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        console.log("AI player deployed, disabling shooting");
        // mod.AIEnableShooting(player, false);
        mod.AIEnableTargeting(player, false);
        mod.SetPlayerMaxHealth(player, 1);
        PositionBot(player);
        JoinTimes.delete(mod.GetObjId(player));
        pendingSpawns--;
    } else {
        console.log("Player deployed");
    }
}

const JoinTimes = new Map<number, number>();
export function OnPlayerJoinGame(player: mod.Player) {
    console.log("Player joined game: ", mod.GetObjId(player));
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        const now = mod.GetMatchTimeElapsed();
        JoinTimes.set(mod.GetObjId(player), now);
    }
}

export function OnPlayerLeaveGame(playerId: number) {
    console.log("Player left game: ", playerId);
    JoinTimes.delete(playerId);
    pendingSpawns--;
}

export function OnManDown(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        // mod.Kill(player);
    }
}

const BotAlignmentVectorStart = mod.CreateVector(-207, 139, 220);
const BotAlignmentVectorEnd = mod.CreateVector(-101, 139, 117);
const BotIndexes: Map<number, number> = new Map();
function PositionBot(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    let botIndex = BotIndexes.get(playerId);
    if (!botIndex) {
        botIndex = BotIndexes.size;
        BotIndexes.set(playerId, botIndex);
    }
    // bots should be placed on the bot alignment vector in order of botindex with 1m spacing
    // subtract vectors
    // then reduce the resultant vector to 1m
    // then multiply by the bot index
    // then add the start vector
    const delta = mod.Subtract(BotAlignmentVectorEnd, BotAlignmentVectorStart);
    const unitDelta = mod.Normalize(delta);
    const position = mod.Add(BotAlignmentVectorStart, mod.Multiply(unitDelta, botIndex));
    mod.Teleport(player, position, 0);
}