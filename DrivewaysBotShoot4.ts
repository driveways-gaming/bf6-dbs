
let currentSpawnerId = 100;
function nextSpawner(): mod.Spawner {
    currentSpawnerId++;
    if (currentSpawnerId > 163) {
        currentSpawnerId = 100;
    }
    return mod.GetSpawner(currentSpawnerId);
}
const maxBotsSpawned = 999;
let botsSpawned = 0;
function SpawnBot() {
    if (botsSpawned >= maxBotsSpawned) {
        return;
    }
    botsSpawned++;
    const spawner = nextSpawner();
    if (spawner) {
        mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team2);
    }
}

const team1 = mod.GetTeam(1);
const team2 = mod.GetTeam(2);
let gameStarted = false;
export function OnGameModeStarted() {
    console.log("OnGameModeStarted");
    mod.SetAIToHumanDamageModifier(0);
    for (let i = 100; i <= 163; i++) {
        mod.AISetUnspawnOnDead(mod.GetSpawner(i), true);
        mod.SetUnspawnDelayInSeconds(mod.GetSpawner(i), 0);
    }
    const capturePoint = mod.GetCapturePoint(400);
    if (capturePoint) {
        mod.EnableGameModeObjective(capturePoint, true);
    } else {
        console.log("Failed to get capture point");
    }
    for (let i = 0; i < 63; i++) {
        SpawnBot();
    }
    gameStarted = true;
}

let tick = 0;
export function OngoingGlobal() {
    tick++;
}

export function OngoingPlayer(player: mod.Player) {
    if (tick % 30 == 0) {
        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
            mod.SetInventoryAmmo(player, mod.InventorySlots.PrimaryWeapon, 200);
        }
    }

}

export function OnPlayerDeployed(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        PositionBot(player);
    } else {
        mod.SetTeam(player, team1);
    }
}

export function OnPlayerInteract(player: mod.Player, eventInteractPoint: mod.InteractPoint) {
    mod.EndGameMode(player);
}

export function OnPlayerDied(player: mod.Player, eventOtherPlayer: mod.Player, eventDeathType: mod.DeathType, eventWeaponUnlock: mod.WeaponUnlock) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        const playerId = mod.GetObjId(player);
        FreeBotSlot(playerId);
        SpawnBot();
    }
}

export function OnPlayerJoinGame(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        mod.AIEnableShooting(player, false);
        mod.SetPlayerMaxHealth(player, 1);
    } else {
        mod.SetTeam(player, team1);
    }
}

export function OnPlayerEnterVehicle(player: mod.Player, vehicle: mod.Vehicle) {
    mod.DealDamage(vehicle, 125);
}


const BotAlignmentVectorStart = mod.CreateVector(-207, 138.5, 220);
const BotAlignmentUnitDelta = mod.Normalize(mod.Subtract(mod.CreateVector(-101, 138.5, 117), BotAlignmentVectorStart));
const BotPositionVectors = new Array<mod.Vector>();
const BotSlotAssignments = new Array<number>();

function FirstFreeBotSlot(): number {
    for (let i = 0; i < BotSlotAssignments.length; i++) {
        if (BotSlotAssignments[i] === undefined) {
            return i;
        }
    }
    return BotSlotAssignments.length;
}

function PositionBot(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    // Assign bot to first free slot
    const botIndex = FirstFreeBotSlot();
    BotSlotAssignments[botIndex] = playerId;
    // Calculate or retrieve position
    let position = BotPositionVectors[botIndex];
    if (!position) {
        position = mod.Add(BotAlignmentVectorStart, mod.Multiply(BotAlignmentUnitDelta, botIndex));
        BotPositionVectors[botIndex] = position;
    }
    mod.Teleport(player, position, 0);
}

function FreeBotSlot(playerId: number) {
    const index = BotSlotAssignments.indexOf(playerId);
    if (index !== -1) {
        BotSlotAssignments[index] = undefined as any;
    }
}