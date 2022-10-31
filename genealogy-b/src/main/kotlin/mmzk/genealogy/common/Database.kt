package mmzk.genealogy.common

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.net.URI
import mmzk.genealogy.common.dao.Item
import mmzk.genealogy.common.dao.Relationship
import mmzk.genealogy.common.dto.AdditionalProperty
import mmzk.genealogy.common.dto.ItemDTO
import mmzk.genealogy.common.dto.RelationsResponse
import mmzk.genealogy.common.dto.RelationshipDTO
import mmzk.genealogy.common.tables.*
import mmzk.genealogy.common.tables.RelationshipTable.type
import org.jetbrains.exposed.dao.EntityID
import org.jetbrains.exposed.sql.*
import org.jetbrains.exposed.sql.Database
import org.jetbrains.exposed.sql.statements.fillParameters
import org.jetbrains.exposed.sql.transactions.TransactionManager
import org.jetbrains.exposed.sql.transactions.transaction

object Database {
    private val dbUrl = System.getenv("DATABASE_URL")

    fun init() {
        Database.connect(hikari())
    }

    private fun hikari(): HikariDataSource {
        val config = HikariConfig()
        config.driverClassName = "org.postgresql.Driver"
        val url = URI(dbUrl)
        config.jdbcUrl = "jdbc:postgresql://" + url.host + url.path + "?sslmode=require"
        val (username, password) = url.userInfo.split(":")
        config.username = username
        config.password = password
        config.maximumPoolSize = 3
        config.isAutoCommit = false
        config.transactionIsolation = "TRANSACTION_REPEATABLE_READ"
        config.validate()
        return HikariDataSource(config)
    }

    fun findItemByName(name: String): List<ItemDTO> = transaction {
        val statement = TransactionManager.current().connection.prepareStatement("""
            SELECT indexed_item.*, ts_rank_cd(indexed_aliases, query) AS rank
            FROM indexed_item, websearch_to_tsquery(?) as query
            WHERE indexed_aliases @@ query
            ORDER BY rank DESC
            LIMIT 20;
        """.trimIndent())
        statement.fillParameters(listOf(TextColumnType() to name))
        val resultSet = statement.executeQuery()
        val list = mutableListOf<Item>()
        val fields: List<Expression<*>> = listOf(ItemTable.name, ItemTable.id, ItemTable.description, ItemTable.aliases)
        while (resultSet.next()) {
            val resultRow = ResultRow.create(resultSet, fields)
            list.add(Item.wrapRow(resultRow))
        }
        list.toDTOWithAdditionalProperties()
    }

    fun insertItems(items: List<ItemDTO>) = transaction {
        for (item in items) {
            ItemTable.insertIgnore {
                it[id] = EntityID(item.id, ItemTable)
                it[name] = item.name
                it[description] = item.description
            }

            for (property in item.additionalProperties) {
                AdditionalPropertiesTable.insertIgnore {
                    it[itemId] = item.id
                    it[propertyId] = property.propertyId
                    it[value] = property.value
                }
            }
        }
    }

    private fun findRelatedItems(ids: Set<String>, typeFilter: List<String>): Pair<Set<RelationshipDTO>, Set<String>> {
        val relationships = Relationship.find {
            RelationshipTable.item1.asStringColumn.inList(ids) and
                    type.asStringColumn.inList(typeFilter)
        }
        val items = relationships.mapNotNull {
            if (it.item1.id.value in ids && it.item2.id.value in ids) {
                null
            } else if (it.item1.id.value in ids) {
                it.item2
            } else {
                it.item1
            }
        }

        return relationships.mapTo(mutableSetOf(), ::RelationshipDTO) to items.mapTo(mutableSetOf()) { it.id.value }
    }

    fun findRelatedItems(id: String, typeFilter: List<String>, depth: Int = 1) =
        transaction {
            val visited = mutableSetOf<String>()
            var frontier = setOf(id)
            var curDepth = 0
            val targets = Item.find {
                ItemTable.id.asStringColumn.inList(frontier)
            }.toDTOWithAdditionalProperties()
            val people = mutableSetOf<ItemDTO>()
            val relations = mutableSetOf<RelationshipDTO>()

            while (true) {
                val newPeople = Item.find {
                    ItemTable.id.asStringColumn.inList(frontier)
                }.toDTOWithAdditionalProperties()
                people.addAll(newPeople)
                visited.addAll(newPeople.map { it.id })
                if (curDepth >= depth) {
                    break
                }
                val (newRelations, nextPeople) = findRelatedItems(
                    frontier,
                    typeFilter
                )
                relations.addAll(newRelations)
                frontier = nextPeople.filterTo(mutableSetOf()) { !visited.contains(it) }
                curDepth++
            }

            RelationsResponse(targets, people.toList(), relations.toList())
        }

    private fun Iterable<Item>.toDTOWithAdditionalProperties(): List<ItemDTO> {
        val additionalPropertiesByItem = AdditionalPropertiesTable.innerJoin(PropertyTypeTable).select {
            AdditionalPropertiesTable.itemId.inList(this@toDTOWithAdditionalProperties.map { it.id.value })
        }.groupBy { it[AdditionalPropertiesTable.itemId] }
        return this.map { dao ->
            ItemDTO(dao, additionalPropertiesByItem[dao.id.value]?.map(::AdditionalProperty) ?: listOf())
        }
    }

    private val Column<EntityID<String>>.asStringColumn get() = castTo<String>(VarCharColumnType(32))
}