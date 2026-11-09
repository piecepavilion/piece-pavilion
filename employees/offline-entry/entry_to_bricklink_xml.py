"""Convert Entry tab -> BrickLink Mass Upload XML. Usage: python entry_to_bricklink_xml.py Piece_Pavilion_Offline_Entry.xlsx"""
import sys, openpyxl
from xml.sax.saxutils import escape
wb=openpyxl.load_workbook(sys.argv[1],data_only=False)
cid={r[0].value:r[1].value for r in wb["Colors"].iter_rows(min_row=2)}
out=["<INVENTORY>"]; n=0
for r in wb["Entry"].iter_rows(min_row=2,values_only=True):
    no,typ,color,cond,qty,price,bin_,desc=r[:8]
    if not no or not qty: continue
    t={"PART":"P","SET":"S","MINIFIG":"M"}.get(typ or "PART","P")
    x=f"<ITEM><ITEMTYPE>{t}</ITEMTYPE><ITEMID>{escape(str(no))}</ITEMID>"
    if t=="P" and color: x+=f"<COLOR>{cid.get(color,0)}</COLOR>"
    x+=f"<CONDITION>{cond or 'N'}</CONDITION><QTY>{int(qty)}</QTY><PRICE>{float(str(price).replace('$','') or 0):.2f}</PRICE>"
    if bin_: x+=f"<REMARKS>{escape(str(bin_))}</REMARKS>"
    out.append(x+"</ITEM>"); n+=1
out.append("</INVENTORY>")
open("bricklink_upload.xml","w",encoding="utf-8").write("\n".join(out)); print(n,"items -> bricklink_upload.xml")
