package mmzk.genealogy.common

import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import java.net.URI
import mmzk.genealogy.common.dao.Item
import mmzk.genealogy.common.dao.Relationship
import mmzk.genealogy.common.dto.*
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
        val statement = TransactionManager.current().connection.prepareStatement(
            """
            SELECT indexed_item.*, ts_rank_cd(indexed_aliases, query) AS rank
            FROM indexed_item, websearch_to_tsquery(?) as query
            WHERE indexed_aliases @@ query
            ORDER BY rank DESC
            LIMIT 20;
        """.trimIndent()
        )
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
                it[aliases] = item.aliases
            }

            for (property in item.additionalProperties) {
                AdditionalPropertyTable.insertIgnore {
                    it[itemId] = item.id
                    it[propertyId] = property.propertyId
                    it[value] = property.value
                    it[valueHash] = property.valueHash
                }
                for (qualifier in property.qualifiers) {
                    QualifierTable.insertIgnore {
                        it[itemId] = item.id
                        it[qualifierType] = qualifier.typeId
                        it[value] = qualifier.value
                        it[valueHash] = property.valueHash
                        it[propertyId] = property.propertyId
                    }
                }
            }
        }
    }

    fun insertRelations(relations: List<RelationshipDTO>) = transaction {
        for (relation in relations) {
            RelationshipTable.insertIgnore {
                it[item1] = EntityID(relation.item1Id, ItemTable)
                it[item2] = EntityID(relation.item2Id, ItemTable)
                it[type] = EntityID(relation.typeId, PropertyTypeTable)
            }
        }
    }

    fun insertProperties(propertyMap: Map<String, String>) = transaction {
        for (propertyEntry in propertyMap) {
            PropertyTypeTable.insertIgnore {
                it[id] = EntityID(propertyEntry.key, PropertyTypeTable)
                it[name] = propertyEntry.value
            }
        }
    }

    private fun findRelatedItems(
        ids: Set<String>,
        homoStrata: Set<String>,
        heteroStrata: Set<String>): Triple<Set<RelationshipDTO>, MutableMap<String, MutableList<String>>, MutableMap<String, MutableList<String>>> {
        val relationships = Relationship.find {
            RelationshipTable.item2.asStringColumn.inList(ids) and
                    type.asStringColumn.inList(homoStrata + heteroStrata)
        }
        val items = relationships.mapNotNull {
            if (it.item1.id.value in ids) {
                null
            } else {
                it.item1
            }
        }

        val sameLevelNewItems = mutableMapOf<String, MutableList<String>>()
        val differentLevelNewItems = mutableMapOf<String, MutableList<String>>()
        for (relation in relationships) {
            if (homoStrata.contains(relation.type.id.value)) {
                sameLevelNewItems.getOrPut(relation.item1.id.value) { mutableListOf() }.add(relation.item2.id.value)
            } else {
                differentLevelNewItems.getOrPut(relation.item1.id.value) { mutableListOf() }.add(relation.item2.id.value)
            }
        }
        differentLevelNewItems -= sameLevelNewItems.keys

        return Triple(
            relationships.mapTo(mutableSetOf(), ::RelationshipDTO),
            sameLevelNewItems, differentLevelNewItems
        )
    }

    fun findRelatedItems(
        id: String,
        homoStrata: Set<String>,
        heteroStrata: Set<String>,
        depth: Int,
        visited: MutableSet<String>
    ) =
        transaction {
            var frontier = mapOf(id to 0)
            val targets = Item.find {
                ItemTable.id.asStringColumn.inList(frontier.keys)
            }.toDTOWithAdditionalProperties()
            val items = mutableSetOf<ItemDTO>()
            val relations = mutableSetOf<RelationshipDTO>()

            while (frontier.isNotEmpty()) {
                val newPeople = Item.find {
                    ItemTable.id.asStringColumn.inList(frontier.keys)
                }.toDTOWithAdditionalProperties()
                items.addAll(newPeople)
                visited.addAll(newPeople.map { it.id })
                val (newRelations, nextSameLevelItems, nextDifferentLevelItems) = findRelatedItems(frontier.keys, homoStrata, heteroStrata)

                frontier = nextSameLevelItems.map {it.key to it.value.minOf { value -> frontier[value]!! }  }
                    .filter { !visited.contains(it.first) && it.second <= depth }
                    .toMap() + nextDifferentLevelItems.map { it.key to it.value.minOf { value -> frontier[value]!! } + 1 }
                    .filter { !visited.contains(it.first) && it.second <= depth }
                relations.addAll(newRelations.filter { visited.contains(it.item1Id) || frontier.contains(it.item1Id) })
            }

            RelationsResponse(targets, items.toList(), relations.toList())
        }

    private fun Iterable<Item>.toDTOWithAdditionalProperties(): List<ItemDTO> {
        val qualifiersByItem =
            AllPropertiesAndQualifiersView.select {
                AllPropertiesAndQualifiersView.id.inList(this@toDTOWithAdditionalProperties.map { it.id.value })
            }
                .groupBy { it[AllPropertiesAndQualifiersView.id] }
                .mapValues { (_, v) ->
                    v.groupBy { it[AllPropertiesAndQualifiersView.propertyId] to it[AllPropertiesAndQualifiersView.valueHash] }
                }
        return this.map { dao ->
            val qualifiersByProperty = qualifiersByItem[dao.id.value] ?: mapOf()
            val properties = qualifiersByProperty.values.mapNotNullTo(mutableSetOf()) { rows ->
                val qualifiers =
                    rows.mapNotNullTo(mutableSetOf(), QualifierDTO::fromAllPropertiesAndQualifiersResultRow)
                AdditionalPropertyDTO.fromAllPropertiesAndQualifiersResultRow(rows[0], qualifiers)
            }
            ItemDTO(dao, properties)
        }
    }

    private val Column<EntityID<String>>.asStringColumn get() = castTo<String>(VarCharColumnType(32))
}
