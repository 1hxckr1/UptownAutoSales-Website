/*
  # Update dealer API key to match environment configuration

  1. Changes
    - Updates `dealer_api_config` public_api_key for dealer "trinity" to match
      the VITE_FENDER_API_KEY value used by the frontend client
    - This ensures API key authentication succeeds when the client sends
      its configured key

  2. Important Notes
    - The old key `trinity_21a707ff429f42afff343c701b575e54` was not matching
      the client's configured key, causing all form submissions to fail with
      "Invalid API key" (401)
*/

UPDATE dealer_api_config
SET public_api_key = 'fdr_efb7addd795187ed6a8fe1f9b7eb872e3cff268135f88e13b5ef3d4469558aec'
WHERE dealer_id = 'trinity'
  AND public_api_key = 'trinity_21a707ff429f42afff343c701b575e54';