/**
 * Onboarding location helpers — pure, dependency-free so they unit-test cleanly
 * (the country-state-city dataset is loaded lazily in the client component).
 */

export type LocationValue = { country: string; state: string; city: string };

/**
 * Country is always required. State and City are required only when the chosen
 * country/state actually has options for them — many countries have no states,
 * and many states have no cities in the dataset, in which case those levels are
 * legitimately left empty.
 */
export function isLocationValid(
  value: LocationValue,
  hasStates: boolean,
  hasCities: boolean,
): boolean {
  if (!value.country) return false;
  if (hasStates && !value.state) return false;
  if (hasCities && !value.city) return false;
  return true;
}
