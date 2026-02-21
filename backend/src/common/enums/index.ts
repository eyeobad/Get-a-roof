export enum UserRole {
  Tenant = "Tenant",
  Landlord = "Landlord",
  Admin = "Admin",
  Unassigned = "Unassigned",
}

export enum VerificationStatus {
  None = "None",
  Pending = "Pending",
  Approved = "Approved",
  Failed = "Failed",
}

export enum PropertyStatus {
  Draft = "Draft",
  Listed = "Listed",
}

export enum PropertyType {
  Apartment = "Apartment",
  House = "House",
  Condo = "Condo",
  Townhouse = "Townhouse",
  Duplex = "Duplex",
  Bungalow = "Bungalow",
  Penthouse = "Penthouse",
  Villa = "Villa",
  Studio = "Studio",
  Loft = "Loft",
  Other = "Other",
  SelfCompound = "SelfCompound",
  SharedApartment = "SharedApartment",
  SharedCompound = "SharedCompound",
  Shortlet = "Shortlet",
  NonOwnerOccupied = "NonOwnerOccupied",
}

export enum MatchStatus {
  TenantLiked = "TenantLiked",
  LandlordQualified = "LandlordQualified",
  ChatInitiated = "ChatInitiated",
  Dismissed = "Dismissed",
}

export enum VehiclePreference {
  Yes = "Yes",
  No = "No",
  Any = "Any",
}
