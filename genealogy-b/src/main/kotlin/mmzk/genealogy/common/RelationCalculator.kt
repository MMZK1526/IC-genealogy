package mmzk.genealogy.common

import kotlinx.serialization.Serializable
import mmzk.genealogy.common.dto.RelationshipDTO

@Serializable
data class RelationCalculatorRequest(
    val start: String,
    val relations: List<RelationshipDTO>,
)

fun calculateRelations(input: RelationCalculatorRequest): Map<String, List<List<String>>> {
    val relationsMap = input.relations.groupBy { it.item2Id }
    val result = mutableMapOf<String, MutableSet<Set<RelationshipDTO>>>()
    val queue = ArrayDeque(relationsMap[input.start] ?: listOf())
    val visitedItems = mutableSetOf(input.start)
    while(true) {
        val currentRelation = queue.removeFirstOrNull() ?: break
        if (currentRelation.item2Id == input.start) {
            result.getOrPut(currentRelation.item1Id) { mutableSetOf() }.add(setOf(currentRelation))
        } else {
            val pathsToPreviousItem = result[currentRelation.item2Id]
            if (pathsToPreviousItem != null) {
                val pathsToPreviousItemWithoutTarget = pathsToPreviousItem.filter { path ->
                    path.all { edge ->
                        edge.item1Id != currentRelation.item1Id &&
                                edge.item2Id != currentRelation.item1Id

                    }
                }

                if (currentRelation.type == "child") {
                    println("PATHS TO PREVIOUS ITEM")
                    println(pathsToPreviousItem)
                    println("PATHS TO PREVIOUS ITEM FILTERED")
                    println(pathsToPreviousItemWithoutTarget)
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