/**
 * Simple gender prediction based on common names
 * Returns "MALE", "FEMALE", or "UNKNOWN"
 */
export function predictGenderFromName(name: string | null | undefined): "MALE" | "FEMALE" | "UNKNOWN" {
  if (!name) return "UNKNOWN";
  
  const normalizedName = name.trim().split(/\s+/)[0].toLowerCase();
  
  // Common male names
  const maleNames = new Set([
    "philip", "phillip", "phil", "philip", "philip", "philip",
    "john", "james", "robert", "michael", "william", "david", "richard", "joseph", "thomas", "charles",
    "daniel", "matthew", "anthony", "mark", "donald", "steven", "paul", "andrew", "joshua", "kenneth",
    "kevin", "brian", "george", "timothy", "ronald", "jason", "edward", "jeffrey", "ryan", "jacob",
    "gary", "nicholas", "eric", "jonathan", "stephen", "larry", "justin", "scott", "brandon", "benjamin",
    "samuel", "frank", "gregory", "raymond", "alexander", "patrick", "jack", "dennis", "jerry", "tyler",
    "aaron", "jose", "henry", "adam", "douglas", "nathan", "zachary", "kyle", "noah", "ethan",
    "jeremy", "walter", "christian", "keith", "roger", "terry", "austin", "sean", "gerald", "carl",
    "harold", "lawrence", "dylan", "arthur", "jordan", "wayne", "alan", "juan", "willie", "gabriel",
    "louis", "russell", "ralph", "roy", "eugene", "ethan", "mason", "logan", "lucas", "jackson",
  ]);
  
  // Common female names
  const femaleNames = new Set([
    "yelena", "elena", "helen", "helena",
    "mary", "patricia", "jennifer", "linda", "elizabeth", "barbara", "susan", "jessica", "sarah", "karen",
    "nancy", "lisa", "betty", "margaret", "sandra", "ashley", "kimberly", "emily", "donna", "michelle",
    "dorothy", "carol", "amanda", "melissa", "deborah", "stephanie", "rebecca", "sharon", "laura", "cynthia",
    "kathleen", "amy", "angela", "shirley", "anna", "brenda", "pamela", "emma", "nicole", "virginia",
    "maria", "helen", "samantha", "joyce", "victoria", "rachel", "christina", "kelly", "joan", "christine",
    "evelyn", "judith", "megan", "cheryl", "andrea", "hannah", "jacqueline", "martha", "gloria", "teresa",
    "sara", "janice", "marie", "julia", "grace", "judy", "theresa", "madison", "beverly", "denise",
    "marilyn", "amber", "danielle", "rose", "brittany", "diana", "abigail", "jane", "lori", "alexis",
    "marie", "katherine", "lois", "tiffany", "tammy", "nicole", "christina", "sophia", "kayla", "anna",
  ]);
  
  if (maleNames.has(normalizedName)) {
    return "MALE";
  }
  
  if (femaleNames.has(normalizedName)) {
    return "FEMALE";
  }
  
  // Check for common suffixes/endings
  if (normalizedName.endsWith("a") || normalizedName.endsWith("ia") || normalizedName.endsWith("ella") || normalizedName.endsWith("ette")) {
    return "FEMALE";
  }
  
  if (normalizedName.endsWith("son") || normalizedName.endsWith("er") || normalizedName.endsWith("en")) {
    return "MALE";
  }
  
  return "UNKNOWN";
}

