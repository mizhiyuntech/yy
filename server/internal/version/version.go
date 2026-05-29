package version

// Current is the application/schema version. When the backend starts and the
// version recorded in the database differs from this value, the schema is
// migrated (new tables/fields) and the stored version is bumped to match.
const Current = "v1"

// SchemaVersionKey is the system_configs key holding the installed version.
const SchemaVersionKey = "schema_version"
