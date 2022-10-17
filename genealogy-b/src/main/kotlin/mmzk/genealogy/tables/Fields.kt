package mmzk.genealogy.tables

enum class IDType {
    WIKI_DATA
}

class Fields {
    companion object {
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

        const val gender = "P21"
        const val givenName = "P735"
        const val familyName = "P734"
        const val dateOfBirth = "P569"
        const val placeOfBirth = "P19"
        const val dateOfDeath = "P570"
        const val placeOfDeath = "P20"
        const val country = "P17"
        const val spouse = "P26"
        const val father = "P22"
        const val mother = "P23"
        const val female = "Q6581072"
        const val male = "Q6581097"
        const val seriesOrdinal = "P1545"
        const val objectHasRole = "P3831"
        const val maidenName = "Q1376230"

        const val wikiBaseEntityId = "wikibase-entityid"
        const val string = "string"
        const val time = "time"

    }
}
