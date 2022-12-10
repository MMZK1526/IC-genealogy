package mmzk.genealogy

import kotlinx.serialization.Serializable
import mmzk.genealogy.common.dto.RelationsResponse

@Serializable
data class RelationsWkRequest(
    val requestId: ULong,
    val id: String,
    val depth: Int = 0,
    val homoStrata: String?,
    val heteroStrata: String?,
    val visitedItems: List<String>,
    val endpoint: String,
    )

@Serializable
data class RelationsWkResponse(
    val requestId: ULong,
    val errorMessage: ErrorMessage? = null,
    val response: RelationsResponse?,
)

@Serializable
data class ErrorMessage(
    val statusCode: Int,
    val message: String,
)