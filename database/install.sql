
ALTER DATABASE CHARACTER SET utf8 COLLATE utf8_unicode_ci ;

-- Database management utils --
-- databaseAddColumn
--

DROP PROCEDURE IF EXISTS databaseAddColumn;

DELIMITER ;;
CREATE PROCEDURE databaseAddColumn(
	tableName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	colName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	colType VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci
)
BEGIN 
    SET @s = (SELECT IF(
		(SELECT COUNT(*)
			FROM INFORMATION_SCHEMA.COLUMNS
			WHERE table_name = tableName
			AND table_schema = DATABASE()
			AND column_name = colName
		) > 0,
		"SELECT 1",
		CONCAT("ALTER TABLE ", tableName, " ADD ", colName, " ", colType)
	));

	PREPARE stmt FROM @s;
	EXECUTE stmt;
	DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;

-- databaseAddKey
--

DROP PROCEDURE IF EXISTS databaseAddKey;

DELIMITER ;;
CREATE PROCEDURE databaseAddKey(
	tableName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	colNames VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci,
	keyName VARCHAR(45) CHARSET utf8 COLLATE utf8_general_ci
)
BEGIN 
    SET @s = (SELECT IF(
		(SELECT COUNT(*)
			FROM INFORMATION_SCHEMA.STATISTICS
			WHERE table_name = tableName
			AND table_schema = DATABASE()
			AND index_name = keyName
		) > 0,
		"SELECT 1",
		CONCAT("CREATE INDEX ", keyName, " ON ", tableName, " (", colNames, ")")
	));

	PREPARE stmt FROM @s;
	EXECUTE stmt;
	DEALLOCATE PREPARE stmt;
END ;;
DELIMITER ;

-- utcSeconds
-- Converts seconds from the unix epoch into a time

DROP FUNCTION IF EXISTS utcSeconds;
DELIMITER ;;
CREATE FUNCTION utcSeconds(
	seconds BIGINT
) RETURNS DATE
BEGIN
    RETURN DATE_ADD(FROM_UNIXTIME(0), INTERVAL + seconds SECOND);
END;;
DELIMITER ;

-- decimal_trim 
-- Drops trailing 0's and decimal points from big decimal valeus
DROP FUNCTION IF EXISTS decimal_trim ;
DELIMITER ;;
CREATE FUNCTION decimal_trim(
  amount decimal(40,20)
) RETURNS varchar(41)
BEGIN
  --First Trim the 0's
    RETURN TRIM(Trailing '.' FROM TRIM(Trailing '0' FROM amount));
END;;
DELIMITER ;


-- End of utils; Structure starts here


--
-- startBuild
--

DROP PROCEDURE IF EXISTS `createBuildInfo`;

DELIMITER ;;
CREATE PROCEDURE `createBuildInfo`(pipeId int, status int)
BEGIN
	declare major int;
	declare minor int;
	declare patch int;
	declare name VARCHAR(45);
	-- Pull the next version number:
	update pipelines set nextVersionPatch = LAST_INSERT_ID(nextVersionPatch + 1) where id = pipeId;
	select nextVersionMajor, nextVersionMinor, pipelines.`name` into major, minor, name from pipelines where id=pipeId;
	select LAST_INSERT_ID() into patch;
	
	-- Insert it as a new build:
	insert into builds(versionMajor, versionMinor, versionPatch, pipeline, status, started) values(major, minor, patch - 1, pipeId, status, NOW());
	
	-- Return the build ID:
	select 
		LAST_INSERT_ID() as id,
		major as versionMajor,
		minor as versionMinor,
		patch as versionPatch,
        pipeId as pipeline,
		name as pipelineName,
        status as status;
END ;;
DELIMITER ;
