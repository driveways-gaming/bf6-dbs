let currentSpawnerId = 100;
function nextSpawner(): mod.Spawner {
    currentSpawnerId++;
    if (currentSpawnerId > 163) {
        currentSpawnerId = 100;
    }
    return mod.GetSpawner(currentSpawnerId);
}
function SpawnBot() {
    const spawner = nextSpawner();
    if (spawner) {
        mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team2);
    }
}
const team1 = mod.GetTeam(1);
const team2 = mod.GetTeam(2);
let gameStarted = false;
function setup() {
    console.log("OnGameModeStarted");
    const vehicleSpawner = mod.GetVehicleSpawner(700);
    if (vehicleSpawner) {
        mod.SetVehicleSpawnerVehicleType(vehicleSpawner, mod.VehicleList.CV90);
        mod.ForceVehicleSpawnerSpawn(vehicleSpawner);
    }
    const vehicleSpawner2 = mod.GetVehicleSpawner(701);
    if (vehicleSpawner2) {
        mod.SetVehicleSpawnerVehicleType(vehicleSpawner2, mod.VehicleList.M2Bradley);
        mod.ForceVehicleSpawnerSpawn(vehicleSpawner2);
    }
    mod.SetAIToHumanDamageModifier(0);
    for (let i = 100; i <= 163; i++) {
        mod.AISetUnspawnOnDead(mod.GetSpawner(i), true);
        mod.SetUnspawnDelayInSeconds(mod.GetSpawner(i), 0);
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
            const playerId = mod.GetObjId(player);
            if (livePlayers.has(playerId)) {
                mod.SetInventoryAmmo(player, mod.InventorySlots.PrimaryWeapon, 200);
            }
        }
    }
}
const livePlayers = new Set<number>();
export function OnPlayerDeployed(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        PositionBot(player);
    } else {
        mod.DisplayNotificationMessage(mod.Message(mod.stringkeys.WARNING), player);
        mod.SetTeam(player, team1);
    }
    const playerId = mod.GetObjId(player);
    livePlayers.add(playerId);
}
export function OnPlayerInteract(player: mod.Player, eventInteractPoint: mod.InteractPoint) {
    const interactPointId = mod.GetObjId(eventInteractPoint);
    if (interactPointId === 800) {
        mod.EndGameMode(player);
    } else if (interactPointId === 801) {
        setup();
    }
}
export function OnPlayerDied(player: mod.Player, eventOtherPlayer: mod.Player, eventDeathType: mod.DeathType, eventWeaponUnlock: mod.WeaponUnlock) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        const playerId = mod.GetObjId(player);
        FreeBotSlot(playerId);
        SpawnBot();
    }
    const playerId = mod.GetObjId(player);
    livePlayers.delete(playerId);
}
export function OnPlayerLeaveGame(playerId: number) {
    livePlayers.delete(playerId);
}
export function OnPlayerJoinGame(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        mod.AIEnableTargeting(player, false);
        mod.SetPlayerMaxHealth(player, 1000);
    } else {
        mod.SetTeam(player, team1);
    }
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
    const botIndex = FirstFreeBotSlot();
    BotSlotAssignments[botIndex] = playerId;
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