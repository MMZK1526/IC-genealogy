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
    }
}
