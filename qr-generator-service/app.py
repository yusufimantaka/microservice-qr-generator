from flask import Flask, request, send_file
import qrcode
import io

app = Flask(__name__)

# Core API endpoint for exporting compliant QR codes
@app.route('/api/v1/generate', methods=['POST'])
def generate_qr_image():
    data = request.json or {}
    
    # Extract structural configuration parameters sent from the frontend UI
    qr_text = data.get('text', 'https://ciyuar.com')
    foreground = data.get('fill_color', '#000000') 
    background = data.get('back_color', '#ffffff') 

    # 1. Initialize standard-compliant QR engine (ISO/IEC 18004 compliant)
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_text)
    qr.make(fit=True)

    # 2. Render visual image metadata using custom color inputs
    img = qr.make_image(fill_color=foreground, back_color=background)

    # 3. Stream data purely within temporary memory allocation (Stateless approach)
    img_buffer = io.BytesIO()
    img.save(img_buffer, 'PNG')
    img_buffer.seek(0)

    # 4. Stream raw binary data directly back to client asset retrieval pipeline
    return send_file(img_buffer, mimetype='image/png')

if __name__ == '__main__':
    # Internal routing listening on port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)