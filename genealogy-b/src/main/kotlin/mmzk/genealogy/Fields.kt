package mmzk.genealogy

enum class IDType {
    WIKI_DATA
}

object Fields {
    fun parseID(str: String): Pair<IDType?, String>? {
        val split = str.split("-", limit = 2)
        if (split.size <= 1) {
            return null
        }

        return when (split[0]) {
            "WD" -> IDType.WIKI_DATA to split[1]
            else -> null to split[1]
        }
    }

    inline val String.wikidataId get() = "WD-$this"

    const val gender = "P21"
    const val family = "P53"
    const val dateOfBirth = "P569"
    const val placeOfBirth = "P19"
    const val dateOfDeath = "P570"
    const val placeOfDeath = "P20"
    const val spouse = "P26"
    const val father = "P22"
    const val mother = "P25"
    const val child = "P40"

    const val wikiBaseEntityId = "wikibase-entityid"
    const val string = "string"
    const val time = "time"

    val prunableTriangles = listOf(
        Triple(father.wikidataId, child.wikidataId, spouse.wikidataId),
        Triple(mother.wikidataId, child.wikidataId, spouse.wikidataId),
        Triple(spouse.wikidataId, father.wikidataId, mother.wikidataId),
        Triple(spouse.wikidataId, mother.wikidataId, father.wikidataId),
        Triple(child.wikidataId, spouse.wikidataId, child.wikidataId)
    )
}
