/**
 * @license
 * Copyright 2025 The FOAM Authors. All Rights Reserved.
 * http://www.apache.org/licenses/LICENSE-2.0
 */

foam.CLASS({
  package: 'foam.core.reflow',
  name: 'UploadAgent',

  implements: [ 'foam.lang.ContextAgent' ],

  javaImports: [
    'foam.dao.DAO',
    'java.io.ByteArrayInputStream',
    'java.io.ByteArrayOutputStream',
    'java.util.zip.GZIPInputStream',
    'foam.lib.json.JSONParser'
  ],

  properties: [
    {
      class: 'foam.mlang.ExprProperty',

      name: 'sortByProperty',
      documentation: 'Property expression to sort by before processing'
    },
    {
      class: 'String',
      name: 'sortDirection',
      documentation: 'Sort direction: ASC or DESC',
      value: 'ASC'
    },
    {
      class: 'FObjectArray',
      of: 'foam.lang.FObject',
      transient: true,
      name: 'data',
      javaFactory: `
        // Decompress the compressed base64 string data
        if ( getCompressed() != null && ! getCompressed().isEmpty() ) {
          try {
            // Decode base64 to get compressed data
            byte[] compressedData = java.util.Base64.getDecoder().decode(getCompressed());

            // Decompress using GZIP
            java.io.ByteArrayInputStream  bais = new java.io.ByteArrayInputStream(compressedData);
            java.util.zip.GZIPInputStream gzis = new java.util.zip.GZIPInputStream(bais);
            java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();

            byte[] buffer = new byte[1024];
            int len;
            while ( (len = gzis.read(buffer)) != -1 ) {
              baos.write(buffer, 0, len);
            }

            gzis.close();
            bais.close();
            baos.close();

            // Deserialize the decompressed data back to FObject array
            String decompressedJson = new String(baos.toByteArray(), "UTF-8");
            foam.lib.json.JSONParser parser = new foam.lib.json.JSONParser();
            parser.setX(getX());
            Object[] arrayResult = parser.parseStringForArray(decompressedJson, null);

            if ( arrayResult != null && arrayResult.length > 0 ) {
              // Convert Object[] to foam.lang.FObject[] since each object is an FObject
              foam.lang.FObject[] fObjectArray = new foam.lang.FObject[arrayResult.length];
              for ( int i = 0; i < arrayResult.length; i++ ) {
                if ( arrayResult[i] instanceof foam.lang.FObject ) {
                  fObjectArray[i] = (foam.lang.FObject) arrayResult[i];
                }
              }

              return fObjectArray;
            } else {
              System.err.println("Failed to parse decompressed data or array is empty.");
              return new foam.lang.FObject[0];
            }
          } catch ( Exception e ) {
            // Log error and return empty array
            System.err.println("Failed to decompress data: " + e.getMessage());
            return new foam.lang.FObject[0];
          }
        }
        return new foam.lang.FObject[0];
      `
    },
    {
      class: 'String',
      name: 'compressed'
    },
    {
      class: 'Int',
      name: 'processed'
    }
  ],

  methods: [
    async function compressData(data) {
      if ( ! data || data.length === 0 ) return null;

      try {
        // Serialize data to JSON
        const jsonData  = foam.json.Network.stringify(data);
        const dataBytes = new TextEncoder().encode(jsonData);

        // Create compression stream using Response API for efficiency
        const stream = new CompressionStream('gzip');
        const compressedResponse = new Response(
          new Blob([dataBytes]).stream().pipeThrough(stream)
        );

        // Get compressed data as array buffer (more efficient than reading chunks)
        const compressedBuffer = await compressedResponse.arrayBuffer();
        const compressedArray  = new Uint8Array(compressedBuffer);

        // Optimized base64 encoding
        const CHUNK_SIZE = 65536; // 64KB chunks to avoid call stack issues

        if ( compressedArray.length <= CHUNK_SIZE ) {
          // For smaller data, use direct conversion with spread operator
          return btoa(String.fromCharCode.apply(null, compressedArray));
        } else {
          // For larger data, process in chunks and use array join for efficiency
          const chunks = [];
          for ( let i = 0 ; i < compressedArray.length ; i += CHUNK_SIZE ) {
            const chunk = compressedArray.subarray(i, Math.min(i + CHUNK_SIZE, compressedArray.length));
            chunks.push(String.fromCharCode.apply(null, chunk));
          }
          return btoa(chunks.join(''));
        }

      } catch ( e ) {
        console.error('Failed to compress data:', e);
        return null;
      }
    },

    async function normalizeObj() {
      this.compressed = await this.compressData(this.data);
    },
    {
      name: 'execute',
//      type: 'Void',
//      args: 'Context x',
      javaCode: `
        DAO dao = ((DAO) x.get("AGENTDAO"));
        foam.lang.FObject[] data = getData(); // This will trigger decompression via javaFactory

        // Sort the data if sortByProperty is specified
        if ( getSortByProperty() != null ) {
          try {
            final foam.mlang.Expr sortExpr = (foam.mlang.Expr) getSortByProperty();
            final boolean descending = "DESC".equalsIgnoreCase(getSortDirection());

            java.util.Arrays.sort(data, new java.util.Comparator<foam.lang.FObject>() {
              public int compare(foam.lang.FObject o1, foam.lang.FObject o2) {
                try {
                  // Use the expression to evaluate the property value
                  Object v1 = sortExpr.f(o1);
                  Object v2 = sortExpr.f(o2);

                  // Handle null values
                  if ( v1 == null && v2 == null ) return 0;
                  if ( v1 == null ) return descending ? 1 : -1;
                  if ( v2 == null ) return descending ? -1 : 1;

                  // Compare based on type
                  int result;
                  if ( v1 instanceof Comparable ) {
                    result = ((Comparable) v1).compareTo(v2);
                  } else {
                    result = v1.toString().compareTo(v2.toString());
                  }

                  return descending ? -result : result;
                } catch (Exception e) {
                  System.err.println("Error comparing using expression: " + e.getMessage());
                  return 0;
                }
              }
            });
            System.out.println("Sorted " + data.length + " records by expression (" + getSortDirection() + ")");
          } catch (Exception e) {
            System.err.println("Failed to sort data: " + e.getMessage());
            // Continue without sorting
          }
        }

        for ( int i = 0 ; i < data.length ; i++ ) {
          var d = data[i];
          dao.put(d);
        }
        // Clear compressed data to avoid sending back to client
        clearProperty("compressed");
        // Reset transient data property
        clearProperty("data");
        setProcessed(data.length);
      `
    }
  ]
});
