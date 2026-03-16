// "stillness" is the active game world — the other testnet packages are dev/staging
export const EVE_WORLD_PACKAGE =
  "0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c";

export const EVE_TYPES = {
  Assembly: `${EVE_WORLD_PACKAGE}::assembly::Assembly`,
  Character: `${EVE_WORLD_PACKAGE}::character::Character`,
  Gate: `${EVE_WORLD_PACKAGE}::gate::Gate`,
  StorageUnit: `${EVE_WORLD_PACKAGE}::storage_unit::StorageUnit`,
  Turret: `${EVE_WORLD_PACKAGE}::turret::Turret`,
  Killmail: `${EVE_WORLD_PACKAGE}::killmail::Killmail`,
} as const;

export const EVE_EVENTS = {
  AssemblyCreated: `${EVE_WORLD_PACKAGE}::assembly::AssemblyCreatedEvent`,
  CharacterCreated: `${EVE_WORLD_PACKAGE}::character::CharacterCreatedEvent`,
  KillmailCreated: `${EVE_WORLD_PACKAGE}::killmail::KillmailCreatedEvent`,
  GateCreated: `${EVE_WORLD_PACKAGE}::gate::GateCreatedEvent`,
  GateLinked: `${EVE_WORLD_PACKAGE}::gate::GateLinkedEvent`,
  Jump: `${EVE_WORLD_PACKAGE}::gate::JumpEvent`,
  StorageUnitCreated: `${EVE_WORLD_PACKAGE}::storage_unit::StorageUnitCreatedEvent`,
  TurretCreated: `${EVE_WORLD_PACKAGE}::turret::TurretCreatedEvent`,
} as const;
