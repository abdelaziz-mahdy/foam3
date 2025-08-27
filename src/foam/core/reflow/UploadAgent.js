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
            java.io.ByteArrayInputStream bais = new java.io.ByteArrayInputStream(compressedData);
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
            Object parsed = parser.parseString(decompressedJson);
            
            if ( parsed instanceof foam.lang.FObject[] ) {
              return (foam.lang.FObject[]) parsed;
            } else {
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
      name: 'compressed',
      getter: async function(data) {
        if ( ! data || data.length === 0 ) return null;
        
        try {
          // Serialize data to JSON
          const jsonData = foam.json.Network.stringify(data);
          const encoder = new TextEncoder();
          const dataBytes = encoder.encode(jsonData);
          
          // Use browser's CompressionStream
          const stream = new CompressionStream('gzip');
          const writer = stream.writable.getWriter();
          const reader = stream.readable.getReader();
          
          // Write data and close writer
          await writer.write(dataBytes);
          await writer.close();
          
          // Read all compressed chunks
          const chunks = [];
          let done = false;
          while ( ! done ) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if ( value ) chunks.push(value);
          }
          
          // Combine chunks into single array
          const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const compressedData = new Uint8Array(totalLength);
          let offset = 0;
          for ( const chunk of chunks ) {
            compressedData.set(chunk, offset);
            offset += chunk.length;
          }
          
          // Convert to base64 string
          const base64String = btoa(String.fromCharCode.apply(null, compressedData));
          return base64String;
          
        } catch ( e ) {
          console.error('Failed to compress data:', e);
          return null;
        }
      }
    },
    {
      class: 'Int',
      name: 'processed'
    }
  ],

  methods: [
    {
      name: 'execute',
//      type: 'Void',
//      args: 'Context x',
      javaCode: `
        DAO dao = ((DAO) x.get("AGENTDAO"));
        foam.lang.FObject[] data = getData(); // This will trigger decompression via javaFactory
        for ( int i = 0 ; i < data.length ; i++ ) {
          var d = data[i];
          dao.put(d);
        }
        // Clear compressed data to avoid sending back to client
        setCompressed(null);
        // Reset transient data property
        clearProperty("data");
        setProcessed(data.length);
      `
    }
  ]
});
