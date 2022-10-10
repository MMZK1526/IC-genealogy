package mmzk.genealogy

import org.jetbrains.exposed.sql.*

object Person : Table() {
    val name = varchar("name", 50)
    val dateOfBirth = date("date_of_birth")
    val dateOfDeath = date("date_of_death").nullable()
    val father = varchar("father", 50)
    val mother = varchar("mother", 50)
    val uid = uuid("uid").primaryKey()
}