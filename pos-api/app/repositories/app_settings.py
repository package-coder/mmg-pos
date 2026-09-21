from app.repositories.base import Repository


# Plain Repository (not BackupRepository): this is local, per-deployment operational
# configuration, not sales/business data — it belongs to whichever instance (a branch's own
# server, or the admin/cloud portal) the setting was changed on, and must never sync between
# them the way transactions/customers/lookups do.
class AppSettingsRepository(Repository):
    _collection = 'app_settings'

    def get_flag(self, key: str, default: bool = False) -> bool:
        doc = self.find_one({'_id': key})
        return bool(doc['enabled']) if doc else default

    def set_flag(self, key: str, enabled: bool):
        # refetch=False: update_one_bare's refetch path assumes an ObjectId _id (it wraps the
        # returned _id in ObjectId(...)), which this string key ('devTestMode') is not.
        self.update_one_bare({'_id': key}, {'enabled': enabled}, refetch=False, upsert=True)
