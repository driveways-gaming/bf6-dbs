// === AI SPAWNER MANAGEMENT ===
// Round-robin spawner ID cycling between 100-163
let currentSpawnerId = 100;
const spawners = new Map<number, mod.Spawner>();
function nextSpawner(): mod.Spawner {
    currentSpawnerId++;
    if (currentSpawnerId > 163) {
        currentSpawnerId = 100;
    }
    let spawner = spawners.get(currentSpawnerId);
    if (!spawner) {
        spawner = mod.GetSpawner(currentSpawnerId);
        spawners.set(currentSpawnerId, spawner);
    }
    return spawner;
}
function SpawnBot() {
    const spawner = nextSpawner();
    if (spawner) {
        mod.SpawnAIFromAISpawner(spawner, mod.SoldierClass.Engineer, team2);
    }
}
export function OnGameModeStarted() {
    setup();
}
// const team1 = mod.GetTeam(1); // Human players
const team2 = mod.GetTeam(2); // AI bots
// === GAME MODE SETUP ===
function setup() {
    console.log("OnGameModeStarted");
    // Disable AI damage to humans (target practice mode)
    mod.SetAIToHumanDamageModifier(0);
    // Configure all spawners: instant unspawn on death
    for (let i = 100; i <= 163; i++) {
        mod.AISetUnspawnOnDead(mod.GetSpawner(i), true);
        mod.SetUnspawnDelayInSeconds(mod.GetSpawner(i), 0);
    }
    // Pre-calculate all 64 bot positions along alignment line (1.5x spacing)
    for (let i = 0; i < 64; i++) {
        BotPositionVectors[i] = mod.Add(BotAlignmentVectorStart, mod.Multiply(BotAlignmentUnitDelta, i * 1.5));
    }
    // Initial spawn of 15 bots
    for (let i = 0; i < 31; i++) {
        SpawnBot();
    }
}
// === ONGOING BEHAVIOR ===
let tick = 0;
export function OngoingGlobal() {
    tick++;
}
export function OngoingPlayer(player: mod.Player) {
    // Every 30 ticks (~1 second)
    const playerId = mod.GetObjId(player);
    let pTick = tick + playerId;
    if (pTick % 15 == 0) {
        if (!mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
            // Human player: refill ammo
            
            if (livePlayers.has(playerId)) {
                mod.SetInventoryAmmo(player, mod.InventorySlots.PrimaryWeapon, 200);
                mod.SetInventoryAmmo(player, mod.InventorySlots.SecondaryWeapon, 200);
            }
        }
    }
}
// === EVENT HANDLERS ===
// Tracks human players currently deployed
const livePlayers = new Set<number>();
export function OnPlayerDeployed(player: mod.Player) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        // AI bot: assign to slot and position
        mod.AIEnableTargeting(player, false);
        mod.AIEnableShooting(player, false);
        mod.SetPlayerMaxHealth(player, 1);
        // PositionBot(player);
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

export function OnPlayerDied(player: mod.Player, eventOtherPlayer: mod.Player, eventDeathType: mod.DeathType, eventWeaponUnlock: mod.WeaponUnlock) {
    if (mod.GetSoldierState(player, mod.SoldierStateBool.IsAISoldier)) {
        // AI bot died: free slot and spawn replacement
        const playerId = mod.GetObjId(player);
        FreeBotSlot(playerId);
        SpawnBot();
    }
    // Remove from live players tracking
    const playerId = mod.GetObjId(player);
    livePlayers.delete(playerId);
}
export function OnPlayerLeaveGame(playerId: number) {
    livePlayers.delete(playerId);
}


export function OnPlayerInteract(player: mod.Player, eventInteractPoint: mod.InteractPoint) {
    const interactPointId = mod.GetObjId(eventInteractPoint);
    if (interactPointId === 800) {
        // Interact point 800: end game
        mod.EndGameMode(player);
    } else if (interactPointId === 801) {
        // Interact point 801: restart/setup
        setup();
    }
}
// === BOT POSITIONING SYSTEM ===
// Line alignment: from (-207, 138.6, 220) to (-101, 138.6, 117)
const BotAlignmentVectorStart = mod.CreateVector(-207, 138.6, 220);
const BotAlignmentUnitDelta = mod.Normalize(mod.Subtract(mod.CreateVector(-101, 138.6, 117), BotAlignmentVectorStart));
const BotPositionVectors = new Array<mod.Vector>();
// === SLOT MANAGEMENT (Performance-optimized) ===
// Bidirectional maps for O(1) lookups
const BotSlotToPlayerId = new Map<number, number>(); // slot -> playerId
const PlayerIdToSlot = new Map<number, number>();     // playerId -> slot
let nextNewSlot = 0;                                  // High water mark
const FreeSlots = new Set<number>();                  // Recycled slots

// Returns lowest available slot (fills from front)
function FirstFreeBotSlot(): number {
    if (FreeSlots.size > 0) {
        // O(n) where n = number of free slots (typically small)
        const minSlot = Math.min(...FreeSlots);
        FreeSlots.delete(minSlot);
        return minSlot;
    }
    // No free slots, allocate new one
    return nextNewSlot++;
}
// Frees a slot when bot dies, making it available for reuse
function FreeBotSlot(playerId: number) {
    const slot = PlayerIdToSlot.get(playerId); // O(1) lookup
    if (slot !== undefined) {
        BotSlotToPlayerId.delete(slot);
        PlayerIdToSlot.delete(playerId);
        FreeSlots.add(slot); // Return to free pool
    }
}
// Assigns bot to next available slot and positions them
function PositionBot(player: mod.Player) {
    const playerId = mod.GetObjId(player);
    const botIndex = FirstFreeBotSlot();
    
    // Register bot in slot tracking maps
    BotSlotToPlayerId.set(botIndex, playerId);
    PlayerIdToSlot.set(playerId, botIndex);
    mod.Teleport(player, BotPositionVectors[botIndex], 0);
}

