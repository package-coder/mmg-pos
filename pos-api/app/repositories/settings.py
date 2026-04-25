


from app.repositories.base import BackupRepository


class SettingRepository(BackupRepository):
    _collection = 'settings'
