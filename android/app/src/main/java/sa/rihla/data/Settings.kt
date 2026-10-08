package sa.rihla.data

import android.content.Context
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.map

private val Context.store by preferencesDataStore("settings")

data class Preferences(
    val theme: String = "SYSTEM",
    val auto: Boolean = false,
    val onboarded: Boolean = false,
    val offlineAttribution: String = "",
)

class Settings(private val context: Context) {
    val flow =
        context.store.data.map {
            Preferences(
                it[stringPreferencesKey("theme")] ?: "SYSTEM",
                it[booleanPreferencesKey("auto")] ?: false,
                it[booleanPreferencesKey("onboarded")] ?: false,
                it[stringPreferencesKey("attribution")] ?: "",
            )
        }

    suspend fun theme(value: String) {
        context.store.edit { it[stringPreferencesKey("theme")] = value }
    }

    suspend fun automatic(value: Boolean) {
        context.store.edit { it[booleanPreferencesKey("auto")] = value }
    }

    suspend fun onboard() {
        context.store.edit { it[booleanPreferencesKey("onboarded")] = true }
    }

    suspend fun attribution(value: String) {
        context.store.edit { it[stringPreferencesKey("attribution")] = value }
    }

    suspend fun clear() {
        context.store.edit { it.clear() }
    }
}
