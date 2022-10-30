package mmzk.genealogy.common

import kotlinx.serialization.Serializable
import mmzk.genealogy.common.dto.RelationshipDTO

@Serializable
data class RelationCalculatorRequest(
    val start: String,
    val relations: Set<RelationshipDTO>
)

fun calculateRelations(
    input: RelationCalculatorRequest,
    trianglesToPrune: List<Triple<String, String, String>>
): Map<String, List<List<String>>> {
    val relationsMap = input.relations.groupBy { it.item2Id }
    val result = mutableMapOf<String, MutableSet<List<RelationshipDTO>>>()
    val queue = ArrayDeque(relationsMap[input.start] ?: listOf())
    val visitedItems = mutableSetOf(input.start)

    while (true) {
        val currentRelation = queue.removeFirstOrNull() ?: break
        if (currentRelation.item2Id == input.start) {
            result.getOrPut(currentRelation.item1Id) { mutableSetOf() }.add(listOf(currentRelation))
        } else {
            val pathsToPreviousItem = result[currentRelation.item2Id]
            if (pathsToPreviousItem != null) {
                val pathsToPreviousItemWithoutTarget = pathsToPreviousItem.filter { path ->
                    path.all { edge ->
                        edge.item1Id != currentRelation.item1Id &&
                                edge.item2Id != currentRelation.item1Id

                    } || isPartOfPrunableTriangle(currentRelation, path, input.relations, trianglesToPrune)
                }

                result.getOrPut(currentRelation.item1Id) { mutableSetOf() }.addAll(
                    pathsToPreviousItemWithoutTarget.map {
                        it + currentRelation
                    }
                )
            }
        }

        if (currentRelation.item1Id !in visitedItems) {
            queue.addAll(relationsMap[currentRelation.item1Id] ?: listOf())
            visitedItems.add(currentRelation.item1Id)
        }
    }

    return result.mapValues { (_, paths) ->
        paths.map { path -> path.map { it.typeId } }
    }
}

private fun isPartOfPrunableTriangle(
    currentRelation: RelationshipDTO,
    path: List<RelationshipDTO>,
    relations: Set<RelationshipDTO>,
    trianglesToPrune: List<Triple<String, String, String>>,
) = trianglesToPrune.any { (side1, side2, side3) ->
    val lastPathComponent = path.lastOrNull()
    currentRelation.typeId == side1 &&
            lastPathComponent != null &&
            lastPathComponent.typeId == side2 &&
            relations.contains(RelationshipDTO(
                currentRelation.item1Id,
                lastPathComponent.item2Id,
                "",
                side3
            ))
}