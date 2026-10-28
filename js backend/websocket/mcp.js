export const CANVAS_SYSTEM_PROMPT = `
You can draw on the user's whiteboard with the canvas tools.

Workflow:
- Call get_canvas_state first, and again before editing or connecting existing objects. Never guess ids.
- Every shape you create returns an id. Use ids with connect, update_shape, move_shape and delete_shape.
- Prefer update_shape / move_shape / delete_shape over deleting and redrawing.

Flowcharts:
- terminator = start/end, rect = process step, decision = yes/no question,
  inputOutput = input or output, document = document, database = data store,
  predefinedProcess = subroutine, manualInput = manual entry, connector = small junction circle.
- Put a short label on every shape (2-5 words).
- Link every step with connect. Label decision branches "Yes" and "No".
- Lay out top-to-bottom with explicit x and y: shapes about 160x80, with about 120 units
  between rows and about 220 units between columns. Put the main path in one column and branches to the side.
- Do not rely on auto-placement for diagrams with more than a few shapes.

Keep your reply short after drawing: say what you drew and offer changes.
`;

export const CANVAS_TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_canvas_state",
        description:
          "Return every object on the whiteboard (id, type, label, x, y, width, height, color, and from/to for connectors) plus the visible area. Call this before editing and after large changes.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
      {
        name: "create_shape",
        description:
          "Create a shape and return its id. Auto-placed in free space when x and y are omitted; for diagrams, pass explicit x and y. Use connect to draw lines or arrows.",
        parameters: {
          type: "OBJECT",
          properties: {
            type: {
              type: "STRING",
              enum: [
                "rect",
                "circle",
                "terminator",
                "decision",
                "inputOutput",
                "document",
                "database",
                "predefinedProcess",
                "manualInput",
                "connector",
              ],
              description:
                "rect=process step, circle=ellipse, terminator=start/end, decision=yes/no diamond, inputOutput=parallelogram, document=wavy-bottom page, database=cylinder, predefinedProcess=box with side bars, manualInput=slanted-top box, connector=small junction circle",
            },
            label: {
              type: "STRING",
              description: "Short text centered inside the shape",
            },
            color: {
              type: "STRING",
              description:
                "Outline and label color as a hex code, for example #3B82F6. The shape interior stays transparent.",
            },
            x: {
              type: "NUMBER",
              description: "Left coordinate in canvas units",
            },
            y: {
              type: "NUMBER",
              description: "Top coordinate in canvas units",
            },
            width: {
              type: "NUMBER",
              description: "Width in canvas units. Defaults to 160.",
            },
            height: {
              type: "NUMBER",
              description: "Height in canvas units. Defaults to 80.",
            },
            strokeWidth: {
              type: "NUMBER",
              description: "Outline thickness. Defaults to 2.",
            },
          },
          required: ["type"],
        },
      },
      {
        name: "connect",
        description:
          "Draw an arrow or line between two existing shapes by id. It attaches to the shape edges and follows them when they move. Use label 'Yes' or 'No' on decision branches.",
        parameters: {
          type: "OBJECT",
          properties: {
            fromId: { type: "STRING", description: "Id of the source shape" },
            toId: { type: "STRING", description: "Id of the target shape" },
            label: {
              type: "STRING",
              description: "Optional text on the connector, for example Yes or No",
            },
            style: {
              type: "STRING",
              enum: ["arrow", "line"],
              description: "arrow (default) has an arrowhead; line does not",
            },
            color: { type: "STRING", description: "Hex color of the connector" },
            strokeWidth: { type: "NUMBER", description: "Line thickness. Defaults to 2." },
          },
          required: ["fromId", "toId"],
        },
      },
      {
        name: "create_text",
        description:
          "Add standalone text, such as a title or note. For text inside a shape, use the label on create_shape instead.",
        parameters: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING", description: "The text to show" },
            x: { type: "NUMBER", description: "Left coordinate in canvas units" },
            y: { type: "NUMBER", description: "Top coordinate in canvas units" },
            fontSize: { type: "NUMBER", description: "Font size. Defaults to 18." },
            color: { type: "STRING", description: "Hex text color" },
          },
          required: ["text"],
        },
      },
      {
        name: "update_shape",
        description:
          "Change an existing object's label, color or size by id. Only the fields you pass are changed.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING", description: "Id of the object" },
            label: { type: "STRING", description: "New label text" },
            color: { type: "STRING", description: "New hex outline color" },
            width: { type: "NUMBER", description: "New width in canvas units" },
            height: { type: "NUMBER", description: "New height in canvas units" },
          },
          required: ["id"],
        },
      },
      {
        name: "move_shape",
        description:
          "Move an object to new top-left coordinates by id. Its label and connectors follow.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING", description: "Id of the object" },
            x: { type: "NUMBER", description: "New left coordinate" },
            y: { type: "NUMBER", description: "New top coordinate" },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_shape",
        description:
          "Delete an object by id, including its label and any connectors attached to it.",
        parameters: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING", description: "Id of the object" },
          },
          required: ["id"],
        },
      },
      {
        name: "delete_selected",
        description: "Delete whatever objects the user currently has selected.",
        parameters: {
          type: "OBJECT",
          properties: {},
        },
      },
    ],
  },
];