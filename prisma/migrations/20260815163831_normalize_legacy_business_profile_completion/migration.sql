DO $$
DECLARE
  expected_count CONSTANT INTEGER := 4;
  eligible_count INTEGER;
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO eligible_count
  FROM "Negocio" AS n
  INNER JOIN "Usuario" AS u
    ON u."id" = n."usuarioId"
  WHERE n."slug" IN (
    'compu-mundo-morelia-lbhq',
    'lumina-beauty-tunja-83sa',
    'multihogar-tunja-facatativa-v91z',
    'vestidos-bogota-bogota-1aog'
  )
    AND n."estado" = 'activo'
    AND n."isTestData" = false
    AND n."archivedAt" IS NULL
    AND u."estado" = 'activo'
    AND u."isPlaceholder" = false
    AND u."perfilCompleto" = false;

  IF eligible_count <> expected_count THEN
    RAISE EXCEPTION
      'Legacy business profile normalization aborted: expected % eligible users, found %',
      expected_count,
      eligible_count;
  END IF;

  UPDATE "Usuario" AS u
  SET "perfilCompleto" = true
  FROM "Negocio" AS n
  WHERE n."usuarioId" = u."id"
    AND n."slug" IN (
      'compu-mundo-morelia-lbhq',
      'lumina-beauty-tunja-83sa',
      'multihogar-tunja-facatativa-v91z',
      'vestidos-bogota-bogota-1aog'
    )
    AND n."estado" = 'activo'
    AND n."isTestData" = false
    AND n."archivedAt" IS NULL
    AND u."estado" = 'activo'
    AND u."isPlaceholder" = false
    AND u."perfilCompleto" = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count <> expected_count THEN
    RAISE EXCEPTION
      'Legacy business profile normalization aborted: expected % updated users, updated %',
      expected_count,
      updated_count;
  END IF;
END $$;
