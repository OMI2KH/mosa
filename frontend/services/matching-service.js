SPECIFIC MATCHING SCENARIOS FOR MOSA
1. Local Tribe Discovery
javascript

// "Find tribes near me that meet on Saturdays for prayer"
matchCriteria: {
  location: "within 10km",
  meetingDay: "saturday", 
  activityType: "prayer",
  language: "amharic"
}

2. Prayer Time Matching
javascript

// "Find prayer partners in my timezone for Fajr prayers"
matchCriteria: {
  timezone: "GMT+3",
  prayerTime: "fajr",
  commitmentLevel: "daily",
  preferredMethod: "voice_call"
}

3. Learning Group Formation
javascript

// "Form study group for Lesson 5 with people available evenings"
matchCriteria: {
  currentLesson: "lesson_5",
  availability: "evenings",
  groupSize: "3-5",
  meetingFrequency: "weekly"
}

4. Spiritual Accountability Partners
javascript

// "Match with someone at similar spiritual level for mutual growth"
matchCriteria: {
  spiritualLevel: "intermediate",
  goals: ["prayer_consistency", "bible_study"],
  checkinFrequency: "daily",
  communicationStyle: "text"
} 
// 1. Location-based matching
function matchByLocation(userLocation, tribeLocations, maxDistance) {
  // Calculate distances and return best matches
}

// 2. Schedule-based matching  
function matchByAvailability(userSchedule, tribeSchedules) {
  // Find overlapping available times
}

// 3. Spiritual compatibility matching
function matchBySpiritualLevel(userLevel, partnerLevel, tolerance) {
  // Match users with compatible spiritual journeys
}

// 4. Hybrid matching (Like Yachi's AI)
function intelligentMatching(user, potentialMatches, weights) {
  // Combine location, schedule, spiritual level, interests
  // Return optimized matches
}