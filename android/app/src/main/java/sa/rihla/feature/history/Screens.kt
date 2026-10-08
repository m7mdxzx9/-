package sa.rihla.feature.history

import android.content.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.unit.*
import com.google.android.gms.location.*
import java.time.*
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.*
import sa.rihla.core.*
import sa.rihla.data.*
import sa.rihla.feature.calendar.*
import sa.rihla.feature.dashboard.*
import sa.rihla.feature.expenses.*
import sa.rihla.feature.history.*
import sa.rihla.feature.onboarding.*
import sa.rihla.feature.settings.*
import sa.rihla.feature.statistics.*
import sa.rihla.feature.tripdetail.*
import sa.rihla.feature.vehicle.*
import sa.rihla.tracking.*
import sa.rihla.ui.*

@Composable
fun History(data: ScreenData, onOpen: (Long) -> Unit) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        if (data.outings.isEmpty()) item { Text(tr("empty")) }
        data.outings
            .groupBy { day(it.startedAt) }
            .forEach { (date, list) ->
                item {
                    Text(
                        date.format(DateTimeFormatter.ofPattern("EEEE d MMMM", Arabic)),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 12.dp),
                    )
                }
                items(list, key = { it.id }) { o -> OutingCard(o, data.now) { onOpen(o.id) } }
            }
    }
}
