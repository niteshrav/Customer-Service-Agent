/**
 * Module: Chat UUID validation
 *
 * isUuid(string) validates conversation_id format before trusting client-supplied ids for Postgres store.
 */
function isUuid(s) {
  return (
    typeof s === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim())
  );
}

module.exports = { isUuid };
