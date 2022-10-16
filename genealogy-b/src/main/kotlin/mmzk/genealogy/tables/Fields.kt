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

        val gender = "P21"
        val givenName = "P735"
        val familyName = "P734"
        val dateOfBirth = "P569"
        val placeOfBirth = "P19"
        val dateOfDeath = "P570"
        val placeOfDeath = "P20"
        val country = "P17"
        val spouse = "P26"
        val father = "P22"
        val mother = "P23"
        val female = "Q6581072"
        val male = "Q6581097"

        val wikiBaseEntityId = "wikibase-entityid"
        val string = "string"
        val time = "time"

    }
}
