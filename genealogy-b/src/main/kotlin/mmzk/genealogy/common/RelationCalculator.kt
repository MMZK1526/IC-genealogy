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
                    val duplicateCheck = path.all { edge ->
                        edge.item1Id != currentRelation.item1Id &&
                                edge.item2Id != currentRelation.item1Id

                    }

                    if (!duplicateCheck) {
                        false
                    } else {
                        when (currentRelation.typeId) {
                            "WD-P22", "WD-P25" -> run {
                                path.lastOrNull()?.let {
                                    it.typeId != "WD-P40" || !input.relations.contains(
                                        RelationshipDTO(
                                            currentRelation.item1Id,
                                            it.item2Id,
                                            "spouse",
                                            "WD-P26"
                                        )
                                    )
                                }
                            } ?: true
                            "WD-P26" -> run {
                                path.lastOrNull()?.let {
                                    ((it.typeId != "WD-P25" || !input.relations.contains(
                                        RelationshipDTO(
                                            currentRelation.item1Id,
                                            it.item2Id,
                                            "father",
                                            "WD-P22"
                                        )
                                    )) && (it.typeId != "WD-P22" || !input.relations.contains(
                                        RelationshipDTO(
                                            currentRelation.item1Id,
                                            it.item2Id,
                                            "mother",
                                            "WD-P25"
                                        )
                                    )))
                                }
                            } ?: true
                            "WD-P40" -> run {
                                path.lastOrNull()?.let {
                                    it.typeId != "WD-P26" || !input.relations.contains(
                                        RelationshipDTO(
                                            currentRelation.item1Id,
                                            it.item2Id,
                                            "child",
                                            "WD-P40"
                                        )
                                    )
                                }
                            } ?: true
                            else -> true
                        }
                    }
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
