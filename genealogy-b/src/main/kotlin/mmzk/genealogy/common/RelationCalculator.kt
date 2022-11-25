package mmzk.genealogy.common

import kotlin.math.*
import kotlinx.serialization.Serializable
import mmzk.genealogy.Fields
import mmzk.genealogy.Fields.wikidataId
import mmzk.genealogy.common.dto.RelationshipDTO

@Serializable
data class RelationCalculatorRequest(
    val start: String,
    val relations: Set<RelationshipDTO>
)

@Serializable
data class RelationCalculatorResponseEntry(
    val relation: List<String>,
    val path: List<String>
)

fun calculateRelations(input: RelationCalculatorRequest): Map<String, List<RelationCalculatorResponseEntry>> {
    val relationsMap = input.relations.groupBy { it.item2Id }
    val result = mutableMapOf<String, MutableSet<List<RelationshipDTO>>>()
    val frontier = ArrayDeque(listOf(input.start))

    while (frontier.isNotEmpty()) {
        val cur = frontier.removeFirst()
        val relations = relationsMap[cur] ?: listOf()
        for (relation in relations) {
            val pathsToPreviousItem = result[cur]
            if (pathsToPreviousItem == null) {
                result.getOrPut(relation.item1Id) { mutableSetOf() }.add(listOf(relation))
                frontier.add(relation.item1Id)
            } else {
                val pathsToPreviousItemWithoutTarget = pathsToPreviousItem.filter { path ->
                    path.all { edge ->
                        edge.item1Id != relation.item1Id &&
                                edge.item2Id != relation.item1Id
                    } && !isPartOfPrunableTriangle(relation, path, input.relations)
                }
                if (result[relation.item1Id]?.any { it -> it.lastOrNull()?.item2Id == cur } == true) {
                    continue
                }
                val oldSize = result.getOrPut(relation.item1Id) { mutableSetOf() }.size
                val newSize = result[relation.item1Id]?.let { r ->
                    r.addAll(pathsToPreviousItemWithoutTarget.map { it + relation })
                    r.size
                }
                if (oldSize != newSize) {
                    frontier.add(relation.item1Id)
                }
            }
        }
    }

    return result.mapValues { (_, paths) ->
        paths.map { path ->
            RelationCalculatorResponseEntry(
                kinshipCalculator(path.map { it.typeId }),
                path.map { it.item1Id })
        }
            .toList()
    }
}

private fun kinshipCalculator(primitives: List<String>): List<String> {
    var risingLvl = 0
    var fallingLvl = 0
    var isRising = false
    var risingGenderIsMale: Boolean? = null
    val result = mutableListOf<String>()

    fun reckoning() {
        if (risingLvl == 0 && fallingLvl == 0) {
            return
        }
        result.add(
            when {
                fallingLvl == 0 -> when (risingGenderIsMale) {
                    true -> if (risingLvl == 1) {
                        "father"
                    } else {
                        "${"great ".repeat(risingLvl - 2)}grandfather"
                    }
                    false -> if (risingLvl == 1) {
                        "mother"
                    } else {
                        "${"great ".repeat(risingLvl - 2)}grandmother"
                    }
                    else -> if (risingLvl == 1) {
                        "parent"
                    } else {
                        "${"great ".repeat(risingLvl - 2)}grandparent"
                    }
                }
                fallingLvl == 1 -> when (risingLvl) {
                    0 -> "child"
                    1 -> "sibling"
                    else -> "${"great ".repeat(risingLvl - 2)}auncle"
                }
                risingLvl == 0 -> "${"great ".repeat(fallingLvl - 2)}grandchild"
                risingLvl == 1 -> "${"great ".repeat(fallingLvl - 2)}nibling"
                else -> if (risingLvl == fallingLvl) {
                    "${makeOrdinal(min(risingLvl, fallingLvl) - 1)} cousin"
                } else {
                    "${makeOrdinal(min(risingLvl, fallingLvl) - 1)} cousin " +
                            "${makeTimes(abs(risingLvl - fallingLvl))} removed"
                }
            }
        )

        risingLvl = 0
        fallingLvl = 0
    }

    for (primitive in primitives) {
        when (primitive) {
            Fields.father.wikidataId -> {
                if (fallingLvl != 0) {
                    reckoning()
                }

                risingLvl += 1
                risingGenderIsMale = true
                isRising = true
            }
            Fields.mother.wikidataId -> {
                if (fallingLvl != 0) {
                    reckoning()
                }

                risingLvl += 1
                risingGenderIsMale = false
                isRising = true
            }
            Fields.child.wikidataId -> {
                if (fallingLvl != 0 && risingLvl != 0 && isRising) {
                    reckoning()
                }

                fallingLvl += 1
                isRising = false
            }
            Fields.spouse.wikidataId -> {
                reckoning()
                result.add("spouse")
            }
            else -> return listOf()
        }
    }
    reckoning()

    return result
}

private fun isPartOfPrunableTriangle(
    currentRelation: RelationshipDTO,
    path: List<RelationshipDTO>,
    relations: Set<RelationshipDTO>,
) = Fields.prunableTriangles.any { (side1, side2, side3) ->
    val lastPathComponent = path.lastOrNull()
    currentRelation.typeId == side1 &&
            lastPathComponent != null &&
            lastPathComponent.typeId == side2 &&
            relations.contains(RelationshipDTO(currentRelation.item1Id, lastPathComponent.item2Id, "", side3))
}

private fun makeOrdinal(n: Int) = when (n % 100) {
    11 -> "11th"
    12 -> "12th"
    13 -> "13th"
    else -> "$n${
        when (n % 10) {
            1 -> "st"
            2 -> "nd"
            3 -> "rd"
            else -> "th"
        }
    }"
}

private fun makeTimes(n: Int) = when (n) {
    1 -> "once"
    2 -> "twice"
    else -> "$n times"
}
