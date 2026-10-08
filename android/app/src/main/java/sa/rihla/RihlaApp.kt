package sa.rihla

import android.app.Application
import androidx.room.Room
import sa.rihla.data.*

class RihlaApp : Application() {
    val database by lazy {
        Room.databaseBuilder(this, JourneyDatabase::class.java, "journeys.db")
            .addMigrations(MIGRATION_1_2)
            .build()
    }
    val repository by lazy { JourneyRepository(database) }
    val settings by lazy { Settings(this) }
}
