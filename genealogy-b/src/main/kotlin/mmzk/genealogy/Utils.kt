package mmzk.genealogy

class CustomTimer(val name: String) {
    private val t1 = System.currentTimeMillis()

    fun end() {
        val t2 = System.currentTimeMillis()
        val delta = (t2 - t1) / 1000
        println("$name took ${delta}s")
    }
}